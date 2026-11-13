"use server";

import { createHash } from "node:crypto";
import { and, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import type { OrderItem } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { newCode } from "@/lib/codes";
import { cartBaht, formatBaht } from "@/lib/pricing";
import { isOnSale } from "@/lib/products";
import { getSettings } from "@/lib/settings";
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
    .values({ userId: user.id, voucherHash: hash })
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
  return { ok: true, amount: r.amount, balance, message: `เติมสำเร็จ +${formatBaht(r.amount)} แต้ม` };
}

// ---------------------------------------------------------------- เติมด้วยพร้อมเพย์ + แนบสลิป (แอดมินตรวจ)

export type SlipState = { ok: boolean; message: string } | undefined;

const MAX_SLIP_CHARS = 2_500_000; // data URL หลังย่อแล้ว (~1.8MB)

export async function submitSlipAction(_: SlipState, form: FormData): Promise<SlipState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const st = await getSettings();
  if (!st.promptpayOpen) return { ok: false, message: "ปิดรับเติมด้วยพร้อมเพย์ชั่วคราว" };

  const baht = Number(form.get("amount"));
  if (!Number.isFinite(baht) || baht < 1 || baht > 50000) return { ok: false, message: "ยอดโอนต้องอยู่ระหว่าง 1–50,000 บาท" };
  const amount = Math.round(baht * 100);

  const image = String(form.get("image") ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return { ok: false, message: "แนบรูปสลิปก่อนส่ง" };
  if (image.length > MAX_SLIP_CHARS) return { ok: false, message: "รูปใหญ่เกินไป ลองแคปหน้าจอสลิปใหม่" };

  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.slips)
    .where(and(eq(schema.slips.userId, user.id), eq(schema.slips.status, "pending")));
  if (n >= 3) return { ok: false, message: "มีสลิปรอตรวจ 3 ใบแล้ว รอแอดมินตรวจก่อนนะ" };

  const imageHash = createHash("sha256").update(image.slice(image.indexOf(",") + 1)).digest("hex");
  const [dup] = await db
    .select({ id: schema.slips.id, status: schema.slips.status })
    .from(schema.slips)
    .where(and(eq(schema.slips.imageHash, imageHash), sql`${schema.slips.status} <> 'rejected'`))
    .limit(1);
  if (dup) return { ok: false, message: "สลิปนี้ถูกส่งเข้าระบบแล้ว" };

  await db.insert(schema.slips).values({ userId: user.id, amount, imageData: image, imageHash });
  revalidatePath("/topup");
  return { ok: true, message: `ส่งสลิป ฿${formatBaht(amount)} แล้ว รอแอดมินตรวจ แต้มจะเข้าหลังอนุมัติ` };
}

// ---------------------------------------------------------------- ซื้อของในตะกร้า

export type CheckoutInput = { items: { id: number; qty: number }[]; mode: "single" | "split" };
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
  const totalBaht = cartBaht(totalRobux, st.robuxPerBaht);
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

  try {
    const orderId = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(schema.users)
        .set({ points: sql`${schema.users.points} - ${cost}` })
        .where(and(eq(schema.users.id, user.id), gte(schema.users.points, cost)))
        .returning({ points: schema.users.points });
      if (!u) throw new Error("NOFUNDS");
      const [o] = await tx
        .insert(schema.orders)
        .values({ userId: user.id, items, totalRobux, totalBaht, robuxPerBaht: st.robuxPerBaht, mode })
        .returning({ id: schema.orders.id });
      await tx.insert(schema.codes).values(
        bundles.map((b) => ({ code: newCode(), orderId: o.id, userId: user.id, passKeys: b.passKeys, label: b.label })),
      );
      await tx.insert(schema.pointLedger).values({
        userId: user.id,
        delta: -cost,
        balanceAfter: u.points,
        kind: "purchase",
        refId: o.id,
        note: `คำสั่งซื้อ #${o.id}`,
      });
      return o.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId };
  } catch (e) {
    if (e instanceof Error && e.message === "NOFUNDS") {
      const [fresh] = await db.select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, user.id));
      return { ok: false, message: "แต้มไม่พอ", need: Math.max(0, cost - (fresh?.points ?? 0)) };
    }
    console.error("checkout failed", e);
    return { ok: false, message: "สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}
