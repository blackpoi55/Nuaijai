"use server";

import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { clientIpHash } from "@/lib/ip";
import { couponLabel, discountFor, findUsableCoupon } from "@/lib/coupons";
import { formatBaht } from "@/lib/pricing";

export type CouponState = { ok: boolean; message: string } | undefined;

/** คูปองแต้มฟรี (หน้าเติมแต้ม) */
export async function redeemPointsCouponAction(_: CouponState, form: FormData): Promise<CouponState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const found = await findUsableCoupon(form.get("coupon"), user.id);
  if (!found.ok) return found;
  const c = found.coupon;
  if (c.kind !== "points") return { ok: false, message: `คูปองนี้เป็นส่วนลด (${couponLabel(c)}) ใช้ในตะกร้าตอนซื้อ` };

  const db = await getDb();
  // กันปั๊มบัญชี: คูปองเดียวกันใช้ซ้ำจาก IP เดิมไม่ได้
  const ip = await clientIpHash();
  if (ip) {
    const [same] = await db
      .select({ id: schema.couponRedemptions.id })
      .from(schema.couponRedemptions)
      .where(and(eq(schema.couponRedemptions.couponId, c.id), eq(schema.couponRedemptions.ip, ip)))
      .limit(1);
    if (same) return { ok: false, message: "คูปองนี้ถูกใช้จากเครื่อง/เน็ตนี้ไปแล้ว" };
  }
  try {
    const balance = await db.transaction(async (tx) => {
      // นับสิทธิ์ก่อน (กันแย่งกันใช้ใบสุดท้าย) แล้วจองสิทธิ์ของคนนี้ (unique ต่อคน)
      const [took] = await tx
        .update(schema.coupons)
        .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
        .where(and(eq(schema.coupons.id, c.id), eq(schema.coupons.active, true), lt(schema.coupons.usedCount, schema.coupons.maxUses)))
        .returning({ id: schema.coupons.id });
      if (!took) throw new Error("FULL");
      await tx.insert(schema.couponRedemptions).values({ couponId: c.id, userId: user.id, amount: c.points, ip });
      const [u] = await tx
        .update(schema.users)
        .set({ points: sql`${schema.users.points} + ${c.points}` })
        .where(eq(schema.users.id, user.id))
        .returning({ points: schema.users.points });
      await tx.insert(schema.pointLedger).values({ userId: user.id, delta: c.points, balanceAfter: u.points, kind: "coupon", note: `คูปอง ${c.code}`, refId: c.id });
      return u.points;
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `ใช้คูปองสำเร็จ +${formatBaht(c.points)} แต้ม • คงเหลือ ${formatBaht(balance)} แต้ม` };
  } catch (e) {
    if (e instanceof Error && e.message === "FULL") return { ok: false, message: "คูปองนี้ถูกใช้ครบจำนวนแล้ว" };
    if (String(e).includes("coupon_user_uq") || String(e).includes("unique")) return { ok: false, message: "คุณใช้คูปองนี้ไปแล้ว" };
    console.error("coupon redeem failed", e);
    return { ok: false, message: "ใช้คูปองไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}

/** เช็คคูปองส่วนลดในตะกร้า (ยังไม่ใช้สิทธิ์ — ใช้จริงตอนกดซื้อ) */
export async function checkDiscountCouponAction(code: string, subtotalBaht: number): Promise<{ ok: true; code: string; discountBaht: number; label: string } | { ok: false; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const found = await findUsableCoupon(code, user.id);
  if (!found.ok) return found;
  const c = found.coupon;
  if (c.kind !== "discount") return { ok: false, message: `คูปองนี้ให้แต้มฟรี (${couponLabel(c)}) ไปกรอกที่หน้าเติมแต้ม` };
  if (subtotalBaht < c.minBaht) return { ok: false, message: `ใช้ได้เมื่อยอดตั้งแต่ ฿${c.minBaht.toLocaleString("th-TH")} ขึ้นไป` };
  return { ok: true, code: c.code, discountBaht: discountFor(c, subtotalBaht), label: couponLabel(c) };
}
