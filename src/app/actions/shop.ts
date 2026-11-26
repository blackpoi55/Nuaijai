"use server";

import { createHash } from "node:crypto";
import { and, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyAdmins, notifyUser } from "@/lib/notify";
import { getDb, schema } from "@/db";
import type { Coupon, OrderItem } from "@/db/schema";
import { activeBonusRules, bonusQty, pickBonus } from "@/lib/bonus";
import { bonusName } from "@/lib/bonus-shared";
import { discountFor, findUsableCoupon } from "@/lib/coupons";
import { getCurrentUser } from "@/lib/auth";
import { newCode } from "@/lib/codes";
import { cartBaht, formatBaht } from "@/lib/pricing";
import { isOnSale } from "@/lib/products";
import { MAX_SLIP_BAHT, MIN_SLIP_BAHT } from "@/lib/promptpay";
import { getSettings, promptPayId } from "@/lib/settings";
import { checkSlip, slipOkConfigured } from "@/lib/slipok";
import { parseVoucher, redeemVoucher } from "@/lib/truemoney";

// ---------------------------------------------------------------- เติมแต้มด้วยซองอั่งเปา

export type TopupState =
  | { ok: true; amount: number; balance: number; message: string }
  | { ok: false; message: string }
  | undefined;

export async function topupAction(_: TopupState, form: FormData): Promise<TopupState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const st = await getSettings();
  if (!st.angpaoOpen) return { ok: false, message: "ปิดรับเติมด้วยซองอั่งเปาชั่วคราว" };

  const hash = parseVoucher(String(form.get("voucher") ?? ""));
  if (!hash) return { ok: false, message: "ลิงก์ซองไม่ถูกต้อง ต้องเป็นลิงก์ gift.truemoney.com/campaign/?v=..." };

  const db = await getDb();

  // ทีละซองต่อคน
  const busy = await db
    .select({ id: schema.topups.id })
    .from(schema.topups)
    .where(and(eq(schema.topups.userId, user.id), eq(schema.topups.status, "pending"), gt(schema.topups.createdAt, new Date(Date.now() - 60_000))))
    .limit(1);
  if (busy.length) return { ok: false, message: "กำลังตรวจซองก่อนหน้าอยู่ รอสักครู่" };

  // จองรหัสซอง (unique) กันส่งซองเดียวกันซ้ำพร้อมกัน
  let topupId: number;
  const [inserted] = await db
    .insert(schema.topups)
    .values({ userId: user.id, voucherHash: hash, isTest: user.role === "admin" })
    .onConflictDoNothing()
    .returning({ id: schema.topups.id });
  if (inserted) {
    topupId = inserted.id;
  } else {
    const [old] = await db.select().from(schema.topups).where(eq(schema.topups.voucherHash, hash)).limit(1);
    if (!old) return { ok: false, message: "ลองใหม่อีกครั้ง" };
    if (old.status === "success") return { ok: false, message: "ซองนี้ถูกใช้เติมไปแล้ว" };
    if (old.userId !== user.id) return { ok: false, message: "ซองนี้ถูกส่งเข้าระบบแล้วโดยบัญชีอื่น" };
    if (old.status === "pending") return { ok: false, message: "กำลังตรวจซองนี้อยู่ รอสักครู่" };
    // เคยล้มเหลว (เช่น เน็ตหลุด) ลองใหม่ได้
    const [re] = await db
      .update(schema.topups)
      .set({ status: "pending", createdAt: new Date(), message: null, providerCode: null })
      .where(and(eq(schema.topups.id, old.id), eq(schema.topups.status, "failed")))
      .returning({ id: schema.topups.id });
    if (!re) return { ok: false, message: "กำลังตรวจซองนี้อยู่ รอสักครู่" };
    topupId = re.id;
  }

  const r = await redeemVoucher(hash);

  if (!r.ok) {
    await db
      .update(schema.topups)
      .set({ status: "failed", providerCode: r.code, message: r.message, finishedAt: new Date() })
      .where(eq(schema.topups.id, topupId));
    return { ok: false, message: r.message };
  }

  const balance = await db.transaction(async (tx) => {
    await tx
      .update(schema.topups)
      .set({ status: "success", amount: r.amount, providerCode: "SUCCESS", senderName: r.sender, finishedAt: new Date() })
      .where(eq(schema.topups.id, topupId));
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${r.amount}` })
      .where(eq(schema.users.id, user.id))
      .returning({ points: schema.users.points });
    await tx.insert(schema.pointLedger).values({
      userId: user.id,
      delta: r.amount,
      balanceAfter: u.points,
      kind: "topup",
      refId: topupId,
      note: "ซองอั่งเปา",
    });
    return u.points;
  });

  revalidatePath("/", "layout");
  if (user.role !== "admin")
    after(() =>
    notifyAdmins({ title: `💰 เติมซองอั่งเปา ฿${formatBaht(r.amount)}`, body: `${user.displayName}${r.sender ? ` (ผู้ส่ง ${r.sender})` : ""}`, url: "/admin/topups" }),
  );
  return { ok: true, amount: r.amount, balance, message: `เติมสำเร็จ +${formatBaht(r.amount)} แต้ม` };
}

// ---------------------------------------------------------------- เติมด้วยพร้อมเพย์ + แนบสลิป (แอดมินตรวจ)

export type SlipState = { ok: boolean; message: string; auto?: boolean } | undefined;

const MAX_SLIP_CHARS = 2_500_000; // data URL หลังย่อแล้ว (~1.8MB)

export async function submitSlipAction(_: SlipState, form: FormData): Promise<SlipState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const st = await getSettings();
  if (!st.promptpayOpen) return { ok: false, message: "ปิดรับเติมด้วยพร้อมเพย์ชั่วคราว" };

  const baht = Number(form.get("amount"));
  if (!Number.isFinite(baht) || baht < MIN_SLIP_BAHT || baht > MAX_SLIP_BAHT)
    return { ok: false, message: `เติมขั้นต่ำ ฿${MIN_SLIP_BAHT} สูงสุด ฿${MAX_SLIP_BAHT.toLocaleString("th-TH")}` };
  const amount = Math.round(baht * 100);

  const image = String(form.get("image") ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return { ok: false, message: "แนบรูปสลิปก่อนส่ง" };
  if (image.length > MAX_SLIP_CHARS) return { ok: false, message: "รูปใหญ่เกินไป ลองแคปหน้าจอสลิปใหม่" };

  const db = await getDb();

  const imageHash = createHash("sha256").update(image.slice(image.indexOf(",") + 1)).digest("hex");
  const [dup] = await db
    .select({ id: schema.slips.id, status: schema.slips.status })
    .from(schema.slips)
    .where(and(eq(schema.slips.imageHash, imageHash), sql`${schema.slips.status} <> 'rejected'`))
    .limit(1);
  if (dup) return { ok: false, message: "สลิปนี้ถูกส่งเข้าระบบแล้ว" };

  // กันยิงสลิปรัว ๆ จนโควต้าตรวจสลิปหมด
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(schema.slips)
    .where(and(eq(schema.slips.userId, user.id), gt(schema.slips.createdAt, new Date(Date.now() - 86400_000))));
  if (today >= 15) return { ok: false, message: "ส่งสลิปวันนี้ครบจำนวนแล้ว ทักแอดมินได้เลย" };

  const isTest = user.role === "admin"; // สลิปของแอดมิน = เทส ไม่นับรายได้

  // ตรวจอัตโนมัติ (SlipOK) — ผ่าน = เติมแต้มทันที • ไม่ผ่าน/ตรวจไม่ได้ = ส่งให้แอดมินตรวจเหมือนเดิม
  const check = st.slipAuto && slipOkConfigured() ? await checkSlip(image, amount, promptPayId()) : null;
  if (check?.transRef) {
    const [used] = await db
      .select({ id: schema.slips.id })
      .from(schema.slips)
      .where(and(eq(schema.slips.transRef, check.transRef), sql`${schema.slips.status} <> 'rejected'`))
      .limit(1);
    if (used) return { ok: false, message: "สลิปนี้ถูกใช้เติมไปแล้ว" };
  }

  if (check?.status === "ok") {
    const got = check.amount;
    const r = await db
      .transaction(async (tx) => {
        const [slip] = await tx
          .insert(schema.slips)
          .values({ userId: user.id, amount: got, imageData: image, imageHash, isTest, status: "approved", auto: true, transRef: check.transRef, checkNote: check.note, reviewedAt: new Date() })
          .returning({ id: schema.slips.id });
        const [u] = await tx
          .update(schema.users)
          .set({ points: sql`${schema.users.points} + ${got}` })
          .where(eq(schema.users.id, user.id))
          .returning({ points: schema.users.points });
        await tx.insert(schema.pointLedger).values({ userId: user.id, delta: got, balanceAfter: u.points, kind: "topup", note: "พร้อมเพย์ (ตรวจสลิปอัตโนมัติ)", refId: slip.id });
        return u.points;
      })
      .catch((e) => {
        // ชน unique trans_ref = มีคนส่งสลิปเดียวกันเข้ามาพร้อมกัน
        if (String(e?.code ?? e?.cause?.code) === "23505") return null;
        throw e;
      });
    if (r === null) return { ok: false, message: "สลิปนี้ถูกใช้เติมไปแล้ว" };
    revalidatePath("/", "layout");
    if (!isTest)
      after(() =>
        notifyAdmins({ title: `✅ สลิปผ่านอัตโนมัติ ฿${formatBaht(got)}`, body: `${user.displayName}${check.sender ? ` • ผู้โอน ${check.sender}` : ""}`, url: "/admin/slips?s=approved", tag: "slip-auto", important: false }),
      );
    return { ok: true, auto: true, message: `ตรวจสลิปผ่าน เติมแล้ว +${formatBaht(got)} แต้ม` };
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.slips)
    .where(and(eq(schema.slips.userId, user.id), eq(schema.slips.status, "pending")));
  if (n >= 3) return { ok: false, message: "มีสลิปรอตรวจ 3 ใบแล้ว รอแอดมินตรวจก่อนนะ" };

  await db.insert(schema.slips).values({ userId: user.id, amount, imageData: image, imageHash, isTest, transRef: check?.transRef ?? null, checkNote: check?.note ?? null });
  revalidatePath("/topup");
  if (!isTest)
    after(() =>
      notifyAdmins({
        title: `🧾 สลิปพร้อมเพย์รอตรวจ ฿${formatBaht(amount)}`,
        body: `จาก ${user.displayName}${check ? ` • ${check.note}` : ""} • กดเพื่อตรวจ`,
        url: "/admin/slips",
        tag: "slip",
        action: "ตรวจสลิป",
      }),
    );
  return { ok: true, message: `ส่งสลิป ฿${formatBaht(amount)} แล้ว รอแอดมินตรวจ แต้มจะเข้าหลังอนุมัติ` };
}

// ---------------------------------------------------------------- ซื้อของในตะกร้า

export type CheckoutInput = { items: { id: number; qty: number }[]; mode: "single" | "split"; coupon?: string };
export type CheckoutResult = { ok: true; orderId: number } | { ok: false; message: string; need?: number };

export async function checkoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const st = await getSettings();
  if (!st.shopOpen) return { ok: false, message: "ร้านปิดชั่วคราว" };

  // ตรวจรูปแบบตะกร้า
  const qty = new Map<number, number>();
  for (const it of Array.isArray(input?.items) ? input.items : []) {
    const id = Number(it?.id);
    const q = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(q >= 1)) continue;
    qty.set(id, Math.min(20, (qty.get(id) ?? 0) + q));
  }
  if (qty.size === 0) return { ok: false, message: "ตะกร้าว่าง" };
  if (qty.size > 30) return { ok: false, message: "ของในตะกร้าเยอะเกินไป" };
  const mode = input?.mode === "split" ? "split" : "single";

  const db = await getDb();
  const prods = await db.select().from(schema.products).where(inArray(schema.products.id, [...qty.keys()]));
  const now = new Date();
  const items: OrderItem[] = [];
  for (const [id, q] of qty) {
    const p = prods.find((x) => x.id === id);
    if (!p || !isOnSale(p, now)) return { ok: false, message: "มีของบางชิ้นในตะกร้าหมดเวลาขายแล้ว ลองรีเฟรชหน้า" };
    items.push({ productId: p.id, passKey: p.passKey, kind: p.kind, name: p.name, priceRobux: p.priceRobux, qty: q });
  }
  if (mode === "single" && items.some((i) => i.kind === "pass" && i.qty > 1)) {
    return { ok: false, message: "โค้ดรวมใส่พาสเดียวกันซ้ำไม่ได้ (คนหนึ่งมีพาสได้ชิ้นเดียว) — เลือก ‘แยกโค้ดทีละชิ้น’" };
  }

  const totalRobux = items.reduce((s, i) => s + i.priceRobux * i.qty, 0);
  const subtotalBaht = cartBaht(totalRobux, st.robuxPerBaht);

  // คูปองส่วนลด (ถ้ามี): ตรวจก่อน แล้วจองสิทธิ์จริงใน transaction เดียวกับการตัดแต้ม
  let coupon: Coupon | null = null;
  let discountBaht = 0;
  if (input?.coupon) {
    const found = await findUsableCoupon(input.coupon, user.id);
    if (!found.ok) return { ok: false, message: found.message };
    if (found.coupon.kind !== "discount") return { ok: false, message: "คูปองนี้ให้แต้มฟรี ไปกรอกที่หน้าเติมแต้ม" };
    if (subtotalBaht < found.coupon.minBaht) return { ok: false, message: `คูปองใช้ได้เมื่อยอดตั้งแต่ ฿${found.coupon.minBaht} ขึ้นไป` };
    coupon = found.coupon;
    discountBaht = discountFor(coupon, subtotalBaht);
  }
  const totalBaht = subtotalBaht - discountBaht;
  const cost = totalBaht * 100;

  // โค้ดที่จะออก
  const bundles: { passKeys: string[]; label: string }[] =
    mode === "single"
      ? [
          {
            // กล่อง/ตั๋วที่ซื้อหลายชิ้น ใส่ id ซ้ำตามจำนวนในโค้ดเดียว
            passKeys: items.flatMap((i) => Array.from({ length: i.qty }, () => i.passKey)),
            label: items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(" + "),
          },
        ]
      : items.flatMap((i) => Array.from({ length: i.qty }, () => ({ passKeys: [i.passKey], label: i.name })));

  // ของแถมตามยอดที่จ่ายจริง (หลังหักคูปอง): ได้ขั้นสูงสุดขั้นเดียว เป็นโค้ดแยกอีกใบ
  const bonus = pickBonus(await activeBonusRules(now), totalBaht);
  const bonusCode = bonus
    ? (() => {
        const q = bonusQty(bonus.rule, bonus.product);
        return { passKeys: Array.from({ length: q }, () => bonus.product.passKey), label: `${bonusName({ name: bonus.product.name, qty: q })} (ของแถม)` };
      })()
    : null;

  // คำสั่งซื้อของแอดมิน = เทส ไม่นับรายได้ และไม่แจ้งเตือน "ขายได้"
  const isTest = user.role === "admin";
  let earnedSpins = 0;
  try {
    const orderId = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(schema.users)
        .set({ points: sql`${schema.users.points} - ${cost}` })
        .where(and(eq(schema.users.id, user.id), gte(schema.users.points, cost)))
        .returning({ points: schema.users.points, spinCredits: schema.users.spinCredits });
      if (!u) throw new Error("NOFUNDS");
      const [o] = await tx
        .insert(schema.orders)
        .values({ userId: user.id, items, totalRobux, totalBaht, subtotalBaht, discountBaht, couponId: coupon?.id ?? null, robuxPerBaht: st.robuxPerBaht, mode, isTest })
        .returning({ id: schema.orders.id });
      if (coupon) {
        const [took] = await tx
          .update(schema.coupons)
          .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
          .where(and(eq(schema.coupons.id, coupon.id), eq(schema.coupons.active, true), lt(schema.coupons.usedCount, schema.coupons.maxUses)))
          .returning({ id: schema.coupons.id });
        if (!took) throw new Error("COUPON");
        await tx.insert(schema.couponRedemptions).values({ couponId: coupon.id, userId: user.id, orderId: o.id, amount: discountBaht });
      }
      await tx.insert(schema.codes).values(
        bundles.map((b) => ({ code: newCode(), orderId: o.id, userId: user.id, passKeys: b.passKeys, label: b.label, isTest })),
      );
      if (bonusCode) await tx.insert(schema.codes).values({ code: newCode(), orderId: o.id, userId: user.id, ...bonusCode, isTest, bonus: true });
      // วงล้อ: ซื้อสะสมครบ bahtPerSpin บาท ได้ 1 สิทธิ์หมุน (คิดจากยอดที่จ่ายจริง)
      if (st.wheelOpen && totalBaht > 0) {
        const per = st.bahtPerSpin;
        const [w] = await tx
          .update(schema.users)
          .set({
            spinCredits: sql`${schema.users.spinCredits} + ((${schema.users.spinProgress} + ${totalBaht}) / ${per})`,
            spinProgress: sql`(${schema.users.spinProgress} + ${totalBaht}) % ${per}`,
          })
          .where(eq(schema.users.id, user.id))
          .returning({ credits: schema.users.spinCredits });
        earnedSpins = w.credits - u.spinCredits;
      }
      await tx.insert(schema.pointLedger).values({
        userId: user.id,
        delta: -cost,
        balanceAfter: u.points,
        kind: "purchase",
        refId: o.id,
        note: coupon ? `คำสั่งซื้อ #${o.id} (คูปอง ${coupon.code} ลด ฿${discountBaht})` : `คำสั่งซื้อ #${o.id}`,
      });
      return o.id;
    });
    revalidatePath("/", "layout");
    if (earnedSpins > 0)
      after(() => notifyUser(user.id, { title: `🎡 ได้สิทธิ์หมุนวงล้อ +${earnedSpins}`, body: "ไปลุ้นรางวัลที่หน้าวงล้อได้เลย", url: "/wheel", action: "หมุนเลย" }));
    if (!isTest)
      after(() =>
      notifyAdmins({
        title: `🛒 ขายได้ ฿${totalBaht.toLocaleString("th-TH")}`,
        body: `${user.displayName}: ${items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(", ")}`.slice(0, 180),
        url: "/admin/codes",
      }),
    );
    return { ok: true, orderId };
  } catch (e) {
    if ((e instanceof Error && e.message === "COUPON") || String(e).includes("coupon_user_uq")) {
      return { ok: false, message: "คูปองนี้ใช้ไม่ได้แล้ว (ครบจำนวนหรือคุณใช้ไปแล้ว)" };
    }
    if (e instanceof Error && e.message === "NOFUNDS") {
      const [fresh] = await db.select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, user.id));
      return { ok: false, message: "แต้มไม่พอ", need: Math.max(0, cost - (fresh?.points ?? 0)) };
    }
    console.error("checkout failed", e);
    return { ok: false, message: "สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}
