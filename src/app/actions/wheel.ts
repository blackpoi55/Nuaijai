"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import type { OrderItem } from "@/db/schema";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { newCode, prettyCode } from "@/lib/codes";
import { randomCoupon } from "@/lib/coupons";
import { getSettings } from "@/lib/settings";
import { available, itemQty, listPrizes, pickPrize } from "@/lib/wheel";

export type SpinResult =
  | { ok: true; prizeId: number; label: string; kind: string; reward: string | null; detail: string; credits: number }
  | { ok: false; message: string };

/** หมุนวงล้อ 1 ครั้ง (ใช้สิทธิ์ที่ได้จากการซื้อ ไม่มีการจ่ายเพื่อหมุน) */
export async function spinAction(): Promise<SpinResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  const st = await getSettings();
  if (!st.wheelOpen) return { ok: false, message: "วงล้อปิดอยู่ชั่วคราว" };

  const prizes = available(await listPrizes());
  const prize = pickPrize(prizes);
  if (!prize) return { ok: false, message: "ยังไม่มีรางวัลบนวงล้อ" };

  const db = await getDb();
  try {
    const out = await db.transaction(async (tx) => {
      // ใช้สิทธิ์ 1 ครั้ง (ไม่มีสิทธิ์ = หมุนไม่ได้)
      const [u] = await tx
        .update(schema.users)
        .set({ spinCredits: sql`${schema.users.spinCredits} - 1` })
        .where(and(eq(schema.users.id, user.id), gt(schema.users.spinCredits, 0)))
        .returning({ credits: schema.users.spinCredits, points: schema.users.points });
      if (!u) throw new Error("NOSPIN");

      if (prize.stock !== null) {
        const [left] = await tx
          .update(schema.wheelPrizes)
          .set({ stock: sql`${schema.wheelPrizes.stock} - 1` })
          .where(and(eq(schema.wheelPrizes.id, prize.id), gt(schema.wheelPrizes.stock, 0)))
          .returning({ id: schema.wheelPrizes.id });
        if (!left) throw new Error("STOCK");
      }

      let reward: string | null = null;
      let detail = "";
      if (prize.kind === "points" && prize.value > 0) {
        const [p] = await tx
          .update(schema.users)
          .set({ points: sql`${schema.users.points} + ${prize.value}` })
          .where(eq(schema.users.id, user.id))
          .returning({ points: schema.users.points });
        await tx.insert(schema.pointLedger).values({ userId: user.id, delta: prize.value, balanceAfter: p.points, kind: "wheel", note: `วงล้อ: ${prize.label}`, refId: prize.id });
        detail = `+${prize.value / 100} แต้ม เข้ากระเป๋าแล้ว`;
      } else if (prize.kind === "coupon" && prize.value > 0) {
        reward = randomCoupon("WIN");
        await tx.insert(schema.coupons).values({
          code: reward,
          kind: "discount",
          discountType: prize.couponType ?? "percent",
          discountValue: prize.value,
          maxUses: 1,
          batch: "wheel",
          ownerId: user.id, // คูปองส่วนตัวของคนที่หมุนได้
          note: `วงล้อ: ${user.displayName}`,
        });
        detail = "คูปองส่วนลด ใช้ในตะกร้าตอนซื้อ";
      } else if (prize.kind === "item" && prize.passKey) {
        const [prod] = await tx.select().from(schema.products).where(eq(schema.products.passKey, prize.passKey)).limit(1);
        const qty = itemQty(prize);
        const item: OrderItem = { productId: prod?.id ?? 0, passKey: prize.passKey, kind: prod?.kind ?? "item", name: prod?.name ?? prize.label, priceRobux: prod?.priceRobux ?? 0, qty };
        const [o] = await tx
          .insert(schema.orders)
          .values({ userId: user.id, items: [item], totalRobux: 0, totalBaht: 0, robuxPerBaht: st.robuxPerBaht, mode: "single", source: "wheel", isTest: user.role === "admin" })
          .returning({ id: schema.orders.id });
        const code = newCode();
        await tx.insert(schema.codes).values({
          code,
          orderId: o.id,
          userId: user.id,
          passKeys: Array.from({ length: qty }, () => prize.passKey as string), // หลายชิ้นในโค้ดเดียว เกมให้ครบตามจำนวน
          label: `${qty > 1 ? `${item.name} ×${qty}` : item.name} (วงล้อ)`,
          isTest: user.role === "admin",
        });
        reward = prettyCode(code);
        detail = "โค้ดของในเกม เก็บไว้ที่ ‘โค้ดของฉัน’ แล้ว";
      } else {
        detail = "อีกนิดเดียว! ลองใหม่ครั้งหน้า";
      }

      await tx.insert(schema.wheelSpins).values({ userId: user.id, prizeId: prize.id, label: prize.label, kind: prize.kind, reward });
      return { reward, detail, credits: u.credits };
    });
    // ไม่สั่งโหลดหน้าใหม่ตรงนี้ ไม่งั้นรายการ "ที่หมุนได้ล่าสุด" กับแต้มจะเปลี่ยนก่อนวงล้อหยุด
    // (หน้าเว็บจะ refresh เองตอนวงล้อหยุดสนิท)
    return { ok: true, prizeId: prize.id, label: prize.label, kind: prize.kind, ...out };
  } catch (e) {
    if (e instanceof Error && e.message === "NOSPIN") return { ok: false, message: "ยังไม่มีสิทธิ์หมุน — ซื้อสะสมครบ ฿" + st.bahtPerSpin + " ได้ 1 สิทธิ์" };
    if (e instanceof Error && e.message === "STOCK") return { ok: false, message: "รางวัลเพิ่งหมด ลองหมุนใหม่อีกครั้ง (ไม่เสียสิทธิ์)" };
    console.error("spin failed", e);
    return { ok: false, message: "หมุนไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}

// ---------------------------------------------------------------- แอดมิน

export type WheelAdminState = { ok?: string; error?: string } | undefined;

export async function savePrizeAction(_: WheelAdminState, f: FormData): Promise<WheelAdminState> {
  await requireAdmin();
  const id = Number(f.get("id")) || 0;
  const label = String(f.get("label") ?? "").trim().slice(0, 24);
  const kind = (["points", "coupon", "item", "none"] as const).find((k) => k === f.get("kind")) ?? "none";
  const raw = Number(f.get("value"));
  const weight = Math.max(0, Math.floor(Number(f.get("weight")) || 0));
  const stockRaw = String(f.get("stock") ?? "").trim();
  const stock = stockRaw === "" ? null : Math.max(0, Math.floor(Number(stockRaw) || 0));
  const passKey = String(f.get("passKey") ?? "").trim() || null;
  const couponType = f.get("couponType") === "baht" ? "baht" : "percent";
  if (!label) return { error: "ใส่ชื่อรางวัล" };
  if (kind === "points" && !(raw > 0)) return { error: "ใส่จำนวนแต้ม" };
  if (kind === "coupon" && !(raw > 0 && (couponType === "baht" || raw <= 100))) return { error: "ใส่ส่วนลด (% ไม่เกิน 100)" };
  if (kind === "item" && !passKey) return { error: "เลือกไอเทม" };
  const values = {
    label,
    kind,
    value: kind === "points" ? Math.round(raw * 100) : kind === "coupon" ? Math.floor(raw) : kind === "item" ? Math.min(50, Math.max(1, Math.floor(raw) || 1)) : 0,
    couponType: kind === "coupon" ? couponType : null,
    passKey: kind === "item" ? passKey : null,
    weight,
    stock,
    color: /^#[0-9a-fA-F]{6}$/.test(String(f.get("color"))) ? String(f.get("color")) : "#e2c27d",
    active: f.get("active") === "on",
    sortOrder: Math.floor(Number(f.get("sortOrder")) || 0),
  } as const;
  const db = await getDb();
  if (id > 0) await db.update(schema.wheelPrizes).set(values).where(eq(schema.wheelPrizes.id, id));
  else await db.insert(schema.wheelPrizes).values(values);
  revalidatePath("/admin/wheel");
  revalidatePath("/wheel");
  return { ok: "บันทึกแล้ว" };
}

export async function deletePrizeAction(id: number) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.wheelPrizes).where(eq(schema.wheelPrizes.id, id));
  revalidatePath("/admin/wheel");
  revalidatePath("/wheel");
}

export async function grantSpinsAction(_: WheelAdminState, f: FormData): Promise<WheelAdminState> {
  await requireAdmin();
  const username = String(f.get("username") ?? "").trim().toLowerCase();
  const n = Math.trunc(Number(f.get("spins")));
  if (!username || !n || Math.abs(n) > 1000) return { error: "ใส่ชื่อผู้ใช้และจำนวนสิทธิ์ (ติดลบ = ลบสิทธิ์)" };
  const db = await getDb();
  const [u] = await db
    .update(schema.users)
    .set({ spinCredits: sql`greatest(0, ${schema.users.spinCredits} + ${n})` })
    .where(eq(schema.users.username, username))
    .returning({ credits: schema.users.spinCredits, name: schema.users.displayName });
  if (!u) return { error: "ไม่พบชื่อผู้ใช้นี้" };
  revalidatePath("/admin/wheel");
  return { ok: `${u.name} มีสิทธิ์หมุน ${u.credits} ครั้ง` };
}
