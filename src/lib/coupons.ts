import "server-only";
import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Coupon } from "@/db/schema";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCoupon(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9_-]{3,32}$/.test(s) ? s : null;
}

export function randomCoupon(prefix = "") {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return prefix ? `${prefix}-${s}` : s;
}

/** ส่วนลด (บาท) ของคูปองนี้กับยอดก่อนลด */
export function discountFor(c: Pick<Coupon, "discountType" | "discountValue">, subtotalBaht: number) {
  const d = c.discountType === "percent" ? Math.floor((subtotalBaht * Math.min(100, c.discountValue)) / 100) : c.discountValue;
  return Math.max(0, Math.min(subtotalBaht, d));
}

export function couponLabel(c: Pick<Coupon, "kind" | "points" | "discountType" | "discountValue">) {
  if (c.kind === "points") return `+${(c.points / 100).toLocaleString("th-TH")} แต้ม`;
  return c.discountType === "percent" ? `ลด ${c.discountValue}%` : `ลด ฿${c.discountValue.toLocaleString("th-TH")}`;
}

/** หาคูปองที่ยังใช้ได้สำหรับผู้ใช้คนนี้ — ตอบเป็นข้อความภาษาไทยถ้าใช้ไม่ได้ */
export async function findUsableCoupon(raw: unknown, userId: number): Promise<{ ok: true; coupon: Coupon } | { ok: false; message: string }> {
  const code = normalizeCoupon(raw);
  if (!code) return { ok: false, message: "รูปแบบคูปองไม่ถูกต้อง" };
  const db = await getDb();
  const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code)).limit(1);
  if (!c || !c.active) return { ok: false, message: "ไม่พบคูปองนี้" };
  if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, message: "คูปองนี้หมดอายุแล้ว" };
  if (c.usedCount >= c.maxUses) return { ok: false, message: "คูปองนี้ถูกใช้ครบจำนวนแล้ว" };
  const [mine] = await db
    .select({ id: schema.couponRedemptions.id })
    .from(schema.couponRedemptions)
    .where(and(eq(schema.couponRedemptions.couponId, c.id), eq(schema.couponRedemptions.userId, userId)))
    .limit(1);
  if (mine) return { ok: false, message: "คุณใช้คูปองนี้ไปแล้ว" };
  return { ok: true, coupon: c };
}
