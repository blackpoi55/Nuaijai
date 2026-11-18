"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyUser } from "@/lib/notify";
import { getDb, schema } from "@/db";
import type { Perk } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { normalizeCoupon, randomCoupon } from "@/lib/coupons";

export type AdminState = { ok?: string; error?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => Math.trunc(Number(f.get(k)));

// ---------------------------------------------------------------- สินค้า

function parsePerks(raw: string): Perk[] {
  // แต่ละบรรทัด: หัวข้อ | รายละเอียด
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [t, ...rest] = l.split("|");
      return { t: t.trim(), d: rest.join("|").trim() };
    })
    .filter((p) => p.t);
}

export async function saveProductAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const id = int(f, "id");
  const passKey = str(f, "passKey");
  const name = str(f, "name");
  const priceRobux = int(f, "priceRobux");
  const robloxProductId = int(f, "robloxProductId");
  const iconRaw = str(f, "iconAssetId");
  const saleEndRaw = str(f, "saleEnd");
  if (!/^[a-z0-9_]{2,40}$/.test(passKey)) return { error: "รหัสในเกม ต้องเป็น a-z 0-9 _ (ต้องตรงกับ id ใน Config.Passes)" };
  if (!name) return { error: "ใส่ชื่อสินค้า" };
  if (!(priceRobux > 0)) return { error: "ราคา Robux ต้องมากกว่า 0" };
  if (!(robloxProductId > 0)) return { error: "ใส่ Developer Product ID" };
  const color = /^#[0-9a-fA-F]{6}$/.test(str(f, "color")) ? str(f, "color") : "#7C5CFF";
  const values = {
    passKey,
    kind: f.get("kind") === "item" ? ("item" as const) : ("pass" as const),
    name,
    priceRobux,
    robloxProductId,
    color,
    blurb: str(f, "blurb"),
    perks: parsePerks(str(f, "perks")),
    iconAssetId: iconRaw ? Number(iconRaw) || null : null,
    active: f.get("active") === "on",
    featured: f.get("featured") === "on",
    sortOrder: Number.isFinite(int(f, "sortOrder")) ? int(f, "sortOrder") : 100,
    // input datetime-local เป็นเวลาไทย
    saleEnd: saleEndRaw ? new Date(`${saleEndRaw}:00+07:00`) : null,
    updatedAt: new Date(),
  };
  const db = await getDb();
  try {
    if (id > 0) await db.update(schema.products).set(values).where(eq(schema.products.id, id));
    else await db.insert(schema.products).values(values);
  } catch (e) {
    if (String(e).includes("unique")) return { error: "รหัสพาสนี้มีอยู่แล้ว" };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: "บันทึกแล้ว" };
}

export async function toggleProductAction(id: number, active: boolean) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.products).set({ active, updatedAt: new Date() }).where(eq(schema.products.id, id));
  revalidatePath("/", "layout");
}

/** ดึงชื่อ/ไอคอนจาก Roblox ด้วย Developer Product ID (ราคาให้ใส่เองเป็นราคาเต็ม) */
export async function fetchRobloxProductAction(productId: number): Promise<{ ok: boolean; name?: string; icon?: number; price?: number; error?: string }> {
  await requireAdmin();
  if (!(productId > 0)) return { ok: false, error: "ID ไม่ถูกต้อง" };
  try {
    const r = await fetch(`https://apis.roblox.com/developer-products/v1/developer-products/${productId}/details`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      return { ok: true, name: j.Name ?? j.name, icon: j.IconImageAssetId ?? j.iconImageAssetId, price: j.PriceInRobux ?? j.priceInRobux };
    }
    const r2 = await fetch(`https://economy.roblox.com/v2/developer-products/${productId}/info`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (r2.ok) {
      const j = await r2.json();
      return { ok: true, name: j.Name, icon: j.IconImageAssetId, price: j.PriceInRobux };
    }
    return { ok: false, error: `Roblox ตอบ ${r2.status}` };
  } catch {
    return { ok: false, error: "เชื่อมต่อ Roblox ไม่ได้" };
  }
}

// ---------------------------------------------------------------- ผู้ใช้

export async function adjustPointsAction(_: AdminState, f: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = int(f, "userId");
  // add = เติมแต้มให้ • refund = คืนแต้ม • deduct = หักแต้ม (ยอดใส่เป็นบวกเสมอ)
  const mode = ["add", "refund", "deduct"].includes(str(f, "mode")) ? str(f, "mode") : "add";
  const baht = Math.abs(Number(f.get("amount")));
  const reason = str(f, "note");
  if (!Number.isFinite(baht) || baht === 0 || baht > 100000) return { error: "ใส่จำนวนแต้ม" };
  const label = { add: "แอดมินเติมแต้มให้", refund: "คืนแต้ม", deduct: "แอดมินหักแต้ม" }[mode as "add" | "refund" | "deduct"];
  const note = reason ? `${label}: ${reason}` : label;
  const delta = Math.round(baht * 100) * (mode === "deduct" ? -1 : 1);
  const db = await getDb();
  const balance = await db.transaction(async (tx) => {
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${delta}` })
      .where(and(eq(schema.users.id, userId), sql`${schema.users.points} + ${delta} >= 0`))
      .returning({ points: schema.users.points });
    if (!u) return null;
    await tx.insert(schema.pointLedger).values({
      userId,
      delta,
      balanceAfter: u.points,
      kind: mode === "refund" ? "refund" : "admin",
      note,
      adminId: admin.id,
    });
    return u.points;
  });
  if (balance === null) return { error: "หักแต้มเกินที่มีไม่ได้" };
  revalidatePath("/admin", "layout");
  after(() =>
    notifyUser(userId, {
      title: `${mode === "deduct" ? "➖" : mode === "refund" ? "↩️" : "🎁"} ${label} ${mode === "deduct" ? "−" : "+"}${baht.toLocaleString("th-TH")} แต้ม`,
      body: `${reason ? reason + " • " : ""}คงเหลือ ${(balance / 100).toLocaleString("th-TH")} แต้ม`,
      url: "/topup",
    }),
  );
  return { ok: `${label} ${baht.toLocaleString("th-TH")} แต้มแล้ว • คงเหลือ ${(balance / 100).toLocaleString("th-TH")}` };
}

export async function resetPasswordAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const userId = int(f, "userId");
  const pw = str(f, "password");
  if (pw.length < 6) return { error: "รหัสผ่านใหม่อย่างน้อย 6 ตัว" };
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  return { ok: "ตั้งรหัสผ่านใหม่แล้ว (ออกจากระบบทุกเครื่อง)" };
}

export async function setUserFlagsAction(userId: number, patch: { banned?: boolean; role?: "user" | "admin" }) {
  const admin = await requireAdmin();
  if (userId === admin.id && (patch.banned || patch.role === "user")) return;
  const db = await getDb();
  await db.update(schema.users).set(patch).where(eq(schema.users.id, userId));
  if (patch.banned) await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  revalidatePath(`/admin/users/${userId}`);
}

// ---------------------------------------------------------------- โค้ด

/**
 * ยกเลิกโค้ด (ใช้ได้เฉพาะโค้ดที่ยังไม่ถูกแลก)
 * refund = true → ยกเลิกการซื้อเต็มรูปแบบ:
 *   • คืนแต้มตามสัดส่วน Robux ของโค้ดนี้ในคำสั่งซื้อ (คิดจากยอดที่จ่ายจริงหลังหักคูปอง)
 *   • หักสิทธิ์หมุนวงล้อที่ได้จากยอดนี้ (ถ้าหมุนไปแล้วจนไม่พอหัก ก็หักเท่าที่มี)
 *   • ถ้าทุกโค้ดในคำสั่งซื้อถูกยกเลิกหมด → คืนสิทธิ์คูปองที่ใช้ ให้ใช้ใหม่ได้
 */
export async function revokeCodeAction(codeId: number, refund: boolean): Promise<AdminState> {
  const admin = await requireAdmin();
  const db = await getDb();
  const st = await getSettings();
  type Done = { userId: number; amount: number; label: string; orderId: number; spinsTaken: number; coupon: string | null };
  let done: Done | null = null;
  const ok = await db.transaction(async (tx) => {
    const [c] = await tx
      .update(schema.codes)
      .set({ status: "revoked" })
      .where(and(eq(schema.codes.id, codeId), eq(schema.codes.status, "active")))
      .returning();
    if (!c) return false;
    if (!refund) return true;
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, c.orderId));
    if (!o) return true;
    const codeRobux = c.passKeys.reduce((s, k) => s + (o.items.find((i) => i.passKey === k)?.priceRobux ?? 0), 0);
    const amount = Math.floor((o.totalBaht * 100 * codeRobux) / Math.max(1, o.totalRobux));
    const result: Done = { userId: c.userId, amount: 0, label: c.label, orderId: o.id, spinsTaken: 0, coupon: null };

    if (amount > 0) {
      const [before] = await tx.select({ credits: schema.users.spinCredits }).from(schema.users).where(eq(schema.users.id, c.userId));
      // สิทธิ์หมุนได้จากยอดซื้อในร้านเท่านั้น — หักยอดที่คืนออกจากยอดสะสม
      const per = Math.max(1, st.bahtPerSpin);
      const back = o.source === "shop" ? Math.floor(amount / 100) : 0;
      const total = sql`greatest(0, ${schema.users.spinCredits} * ${per} + ${schema.users.spinProgress} - ${back})`;
      const [u] = await tx
        .update(schema.users)
        .set({
          points: sql`${schema.users.points} + ${amount}`,
          ...(back > 0 ? { spinCredits: sql`${total} / ${per}`, spinProgress: sql`${total} % ${per}` } : {}),
        })
        .where(eq(schema.users.id, c.userId))
        .returning({ points: schema.users.points, credits: schema.users.spinCredits });
      await tx.insert(schema.pointLedger).values({
        userId: c.userId,
        delta: amount,
        balanceAfter: u.points,
        kind: "refund",
        note: `คืนแต้มโค้ด ${c.label} (ยกเลิกคำสั่งซื้อ #${o.id})`,
        refId: c.id,
        adminId: admin.id,
      });
      result.amount = amount;
      result.spinsTaken = Math.max(0, (before?.credits ?? 0) - u.credits);
    }

    // คืนคูปอง เมื่อยกเลิกครบทุกโค้ดในคำสั่งซื้อนี้แล้ว
    if (o.couponId) {
      const [left] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.codes)
        .where(and(eq(schema.codes.orderId, o.id), sql`${schema.codes.status} <> 'revoked'`));
      if (left.n === 0) {
        const gone = await tx
          .delete(schema.couponRedemptions)
          .where(and(eq(schema.couponRedemptions.couponId, o.couponId), eq(schema.couponRedemptions.orderId, o.id)))
          .returning({ id: schema.couponRedemptions.id });
        if (gone.length) {
          const [cp] = await tx
            .update(schema.coupons)
            .set({ usedCount: sql`greatest(0, ${schema.coupons.usedCount} - 1)` })
            .where(eq(schema.coupons.id, o.couponId))
            .returning({ code: schema.coupons.code });
          result.coupon = cp?.code ?? null;
        }
      }
    }
    done = result;
    return true;
  });
  revalidatePath("/admin/codes");
  if (!ok) return { error: "โค้ดนี้ถูกใช้หรือยกเลิกไปแล้ว" };
  if (!done) return { ok: "ยกเลิกโค้ดแล้ว (ไม่คืนแต้ม)" };
  const r = done as Done;
  const baht = (r.amount / 100).toLocaleString("th-TH");
  const extra = [r.spinsTaken > 0 && `หักสิทธิ์หมุน ${r.spinsTaken} ครั้ง`, r.coupon && `คืนคูปอง ${r.coupon}`].filter(Boolean).join(" • ");
  if (r.amount > 0 || r.coupon)
    after(() =>
      notifyUser(r.userId, {
        title: r.amount > 0 ? `↩️ คืนแต้ม +${baht} แต้ม` : "↩️ ยกเลิกคำสั่งซื้อแล้ว",
        body: `ยกเลิกคำสั่งซื้อ #${r.orderId} (${r.label})${r.coupon ? ` • คูปอง ${r.coupon} กลับมาใช้ได้อีกครั้ง` : ""}`.slice(0, 180),
        url: "/topup",
      }),
    );
  return { ok: `ยกเลิกแล้ว คืน ${baht} แต้ม${extra ? ` • ${extra}` : ""}` };
}

// ---------------------------------------------------------------- ซองที่ค้าง

export async function resolveTopupAction(_: AdminState, f: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = int(f, "id");
  const baht = Number(f.get("amount"));
  if (!(baht > 0)) return { error: "ใส่ยอดเงินที่ได้รับจริง" };
  const amount = Math.round(baht * 100);
  const db = await getDb();
  const target = await db.transaction(async (tx) => {
    const [t] = await tx
      .update(schema.topups)
      .set({ status: "success", amount, message: `แอดมินยืนยัน (${admin.displayName})`, finishedAt: new Date() })
      .where(and(eq(schema.topups.id, id), sql`${schema.topups.status} <> 'success'`))
      .returning();
    if (!t) return null;
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${amount}` })
      .where(eq(schema.users.id, t.userId))
      .returning({ points: schema.users.points });
    await tx.insert(schema.pointLedger).values({ userId: t.userId, delta: amount, balanceAfter: u.points, kind: "topup", note: "ซองอั่งเปา (แอดมินยืนยัน)", refId: t.id, adminId: admin.id });
    return t.userId;
  });
  revalidatePath("/admin/topups");
  if (!target) return { error: "ซองนี้สำเร็จไปแล้ว" };
  after(() => notifyUser(target, { title: `✅ เติมแต้มสำเร็จ +${baht.toLocaleString("th-TH")} แต้ม`, body: "แอดมินยืนยันซองอั่งเปาให้แล้ว", url: "/topup" }));
  return { ok: "เติมแต้มให้แล้ว" };
}

// ---------------------------------------------------------------- สลิปพร้อมเพย์

export async function approveSlipAction(_: AdminState, f: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = int(f, "id");
  const baht = Number(f.get("amount"));
  if (!(baht > 0) || baht > 100000) return { error: "ใส่ยอดที่ได้รับจริง" };
  const amount = Math.round(baht * 100);
  const db = await getDb();
  const who = await db.transaction(async (tx) => {
    const [s] = await tx
      .update(schema.slips)
      .set({ status: "approved", amount, adminId: admin.id, reviewedAt: new Date(), note: null })
      .where(and(eq(schema.slips.id, id), eq(schema.slips.status, "pending")))
      .returning({ userId: schema.slips.userId });
    if (!s) return null;
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${amount}` })
      .where(eq(schema.users.id, s.userId))
      .returning({ points: schema.users.points });
    await tx.insert(schema.pointLedger).values({ userId: s.userId, delta: amount, balanceAfter: u.points, kind: "topup", note: "พร้อมเพย์ (สลิป)", refId: id, adminId: admin.id });
    return { userId: s.userId, balance: u.points };
  });
  revalidatePath("/admin", "layout");
  if (!who) return { error: "สลิปนี้ถูกตรวจไปแล้ว" };
  after(() =>
    notifyUser(who.userId, { title: `✅ เติมแต้มสำเร็จ +${(amount / 100).toLocaleString("th-TH")} แต้ม`, body: `แอดมินอนุมัติสลิปพร้อมเพย์แล้ว • คงเหลือ ${(who.balance / 100).toLocaleString("th-TH")} แต้ม`, url: "/topup" }),
  );
  return { ok: "อนุมัติแล้ว แต้มเข้าแล้ว" };
}

export async function rejectSlipAction(_: AdminState, f: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = int(f, "id");
  const note = str(f, "note").slice(0, 200) || "สลิปไม่ถูกต้อง";
  const db = await getDb();
  const [s] = await db
    .update(schema.slips)
    .set({ status: "rejected", note, adminId: admin.id, reviewedAt: new Date(), transRef: null }) // ปล่อยเลขรายการ ให้ส่งสลิปใบนี้ใหม่ได้ถ้าปฏิเสธผิด
    .where(and(eq(schema.slips.id, id), eq(schema.slips.status, "pending")))
    .returning({ id: schema.slips.id, userId: schema.slips.userId, amount: schema.slips.amount });
  revalidatePath("/admin", "layout");
  if (!s) return { error: "สลิปนี้ถูกตรวจไปแล้ว" };
  after(() => notifyUser(s.userId, { title: `❌ สลิป ฿${(s.amount / 100).toLocaleString("th-TH")} ไม่ผ่าน`, body: note, url: "/topup" }));
  return { ok: "ปฏิเสธแล้ว" };
}

// ---------------------------------------------------------------- ตั้งค่า

export async function saveSettingsAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const rate = Number(f.get("robuxPerBaht"));
  if (!(rate >= 1 && rate <= 100)) return { error: "อัตรา Robux ต่อบาท ต้องอยู่ระหว่าง 1–100" };
  await saveSettings({
    robuxPerBaht: rate,
    shopOpen: f.get("shopOpen") === "on",
    angpaoOpen: f.get("angpaoOpen") === "on",
    promptpayOpen: f.get("promptpayOpen") === "on",
    slipAuto: f.get("slipAuto") === "on",
    announcement: str(f, "announcement").slice(0, 300),
    contactUrl: /^https:\/\//.test(str(f, "contactUrl")) ? str(f, "contactUrl").slice(0, 300) : "",
  });
  revalidatePath("/", "layout");
  return { ok: "บันทึกแล้ว" };
}

// ---------------------------------------------------------------- คูปอง

export async function createCouponsAction(_: AdminState, f: FormData): Promise<AdminState & { codes?: string[] }> {
  const admin = await requireAdmin();
  const kind: "points" | "discount" = f.get("kind") === "discount" ? "discount" : "points";
  const custom = normalizeCoupon(str(f, "custom") || null);
  const quantity = custom ? 1 : Math.min(500, Math.max(1, int(f, "quantity") || 1));
  const maxUses = Math.min(100000, Math.max(1, int(f, "maxUses") || 1));
  const prefix = str(f, "prefix").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const expRaw = str(f, "expiresAt");
  const expiresAt = expRaw ? new Date(`${expRaw}:00+07:00`) : null;
  const note = str(f, "note").slice(0, 200);
  if (str(f, "custom") && !custom) return { error: "โค้ดที่ตั้งเอง ใช้ได้แค่ A-Z 0-9 - _ ยาว 3–32 ตัว" };

  let points = 0;
  let discountType: "percent" | "baht" | null = null;
  let discountValue = 0;
  let minBaht = 0;
  if (kind === "points") {
    const baht = Number(f.get("points"));
    if (!(baht > 0) || baht > 100000) return { error: "ใส่จำนวนแต้มที่ได้" };
    points = Math.round(baht * 100);
  } else {
    discountType = f.get("discountType") === "baht" ? "baht" : "percent";
    discountValue = int(f, "discountValue");
    if (!(discountValue > 0) || (discountType === "percent" && discountValue > 100)) return { error: "ใส่ส่วนลด (% ไม่เกิน 100)" };
    minBaht = Math.max(0, int(f, "minBaht") || 0);
  }

  const batch = `${Date.now().toString(36)}${randomCoupon().slice(0, 4)}`.toLowerCase();
  const db = await getDb();
  const codes = new Set<string>();
  if (custom) codes.add(custom);
  while (codes.size < quantity) codes.add(randomCoupon(prefix));
  try {
    await db.insert(schema.coupons).values(
      [...codes].map((code) => ({ code, kind, points, discountType, discountValue, minBaht, maxUses, expiresAt, batch, note, createdBy: admin.id })),
    );
  } catch (e) {
    if (String(e).includes("unique")) return { error: custom ? "มีคูปองชื่อนี้อยู่แล้ว" : "สุ่มโค้ดชนกัน ลองกดสร้างใหม่" };
    throw e;
  }
  revalidatePath("/admin/coupons");
  return { ok: `สร้างคูปอง ${codes.size} โค้ดแล้ว`, codes: [...codes] };
}

export async function toggleCouponAction(id: number, active: boolean) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.coupons).set({ active }).where(eq(schema.coupons.id, id));
  revalidatePath("/admin/coupons");
}

export async function toggleCouponBatchAction(batch: string, active: boolean) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.coupons).set({ active }).where(eq(schema.coupons.batch, batch));
  revalidatePath("/admin/coupons");
}

/** ลบได้เฉพาะโค้ดที่ยังไม่มีใครใช้ */
export async function deleteUnusedCouponsAction(batch: string) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.coupons).where(and(eq(schema.coupons.batch, batch), eq(schema.coupons.usedCount, 0)));
  revalidatePath("/admin/coupons");
}

/** ปลดล็อกบัญชีที่ใส่รหัสผิดหลายครั้ง (ไม่ต้องเปลี่ยนรหัส) */
export async function unlockUserAction(userId: number) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, userId));
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

/** บันทึกเฉพาะค่าวงล้อ (ไม่ไปทับค่าอื่นในหน้าตั้งค่า) */
export async function saveSettingsPartialAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const per = Math.floor(Number(f.get("bahtPerSpin")));
  if (!(per >= 1 && per <= 100000)) return { error: "ใส่ยอดบาทต่อ 1 สิทธิ์" };
  await saveSettings({ wheelOpen: f.get("wheelOpen") === "on", bahtPerSpin: per });
  revalidatePath("/", "layout");
  return { ok: "บันทึกแล้ว" };
}
