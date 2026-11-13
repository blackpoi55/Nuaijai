"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import type { Perk } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";

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
  if (!/^[a-z0-9_]{2,40}$/.test(passKey)) return { error: "รหัสพาสในเกม ต้องเป็น a-z 0-9 _ (ต้องตรงกับ id ใน Config.Passes)" };
  if (!name) return { error: "ใส่ชื่อสินค้า" };
  if (!(priceRobux > 0)) return { error: "ราคา Robux ต้องมากกว่า 0" };
  if (!(robloxProductId > 0)) return { error: "ใส่ Developer Product ID" };
  const color = /^#[0-9a-fA-F]{6}$/.test(str(f, "color")) ? str(f, "color") : "#7C5CFF";
  const values = {
    passKey,
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
  const baht = Number(f.get("amount"));
  const note = str(f, "note");
  if (!Number.isFinite(baht) || baht === 0) return { error: "ใส่จำนวนแต้ม (ติดลบ = หัก)" };
  if (!note) return { error: "ใส่เหตุผล" };
  const delta = Math.round(baht * 100);
  const db = await getDb();
  const ok = await db.transaction(async (tx) => {
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${delta}` })
      .where(and(eq(schema.users.id, userId), sql`${schema.users.points} + ${delta} >= 0`))
      .returning({ points: schema.users.points });
    if (!u) return false;
    await tx.insert(schema.pointLedger).values({ userId, delta, balanceAfter: u.points, kind: "admin", note, adminId: admin.id });
    return true;
  });
  if (!ok) return { error: "หักแต้มเกินที่มีไม่ได้" };
  revalidatePath(`/admin/users/${userId}`);
  return { ok: "ปรับแต้มแล้ว" };
}

export async function resetPasswordAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const userId = int(f, "userId");
  const pw = str(f, "password");
  if (pw.length < 6) return { error: "รหัสผ่านใหม่อย่างน้อย 6 ตัว" };
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw) }).where(eq(schema.users.id, userId));
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

export async function revokeCodeAction(codeId: number, refund: boolean) {
  const admin = await requireAdmin();
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [c] = await tx
      .update(schema.codes)
      .set({ status: "revoked" })
      .where(and(eq(schema.codes.id, codeId), eq(schema.codes.status, "active")))
      .returning();
    if (!c || !refund) return;
    // คืนแต้มตามสัดส่วน Robux ของโค้ดนี้ในคำสั่งซื้อ
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, c.orderId));
    if (!o) return;
    const codeRobux = c.passKeys.reduce((s, k) => s + (o.items.find((i) => i.passKey === k)?.priceRobux ?? 0), 0);
    const amount = Math.floor((o.totalBaht * 100 * codeRobux) / Math.max(1, o.totalRobux));
    if (amount <= 0) return;
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${amount}` })
      .where(eq(schema.users.id, c.userId))
      .returning({ points: schema.users.points });
    await tx.insert(schema.pointLedger).values({
      userId: c.userId,
      delta: amount,
      balanceAfter: u.points,
      kind: "refund",
      note: `คืนแต้มโค้ด ${c.label}`,
      refId: c.id,
      adminId: admin.id,
    });
  });
  revalidatePath("/admin/codes");
}

// ---------------------------------------------------------------- ซองที่ค้าง

export async function resolveTopupAction(_: AdminState, f: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = int(f, "id");
  const baht = Number(f.get("amount"));
  if (!(baht > 0)) return { error: "ใส่ยอดเงินที่ได้รับจริง" };
  const amount = Math.round(baht * 100);
  const db = await getDb();
  const ok = await db.transaction(async (tx) => {
    const [t] = await tx
      .update(schema.topups)
      .set({ status: "success", amount, message: `แอดมินยืนยัน (${admin.displayName})`, finishedAt: new Date() })
      .where(and(eq(schema.topups.id, id), sql`${schema.topups.status} <> 'success'`))
      .returning();
    if (!t) return false;
    const [u] = await tx
      .update(schema.users)
      .set({ points: sql`${schema.users.points} + ${amount}` })
      .where(eq(schema.users.id, t.userId))
      .returning({ points: schema.users.points });
    await tx.insert(schema.pointLedger).values({ userId: t.userId, delta: amount, balanceAfter: u.points, kind: "topup", note: "ซองอั่งเปา (แอดมินยืนยัน)", refId: t.id, adminId: admin.id });
    return true;
  });
  revalidatePath("/admin/topups");
  return ok ? { ok: "เติมแต้มให้แล้ว" } : { error: "ซองนี้สำเร็จไปแล้ว" };
}

// ---------------------------------------------------------------- ตั้งค่า

export async function saveSettingsAction(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const rate = Number(f.get("robuxPerBaht"));
  if (!(rate >= 1 && rate <= 100)) return { error: "อัตรา Robux ต่อบาท ต้องอยู่ระหว่าง 1–100" };
  await saveSettings({
    robuxPerBaht: rate,
    shopOpen: f.get("shopOpen") === "on",
    topupOpen: f.get("topupOpen") === "on",
    announcement: str(f, "announcement").slice(0, 300),
  });
  revalidatePath("/", "layout");
  return { ok: "บันทึกแล้ว" };
}
