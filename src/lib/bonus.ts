import "server-only";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { BonusRule, Product } from "@/db/schema";
import { iconUrl, listAllProducts, thumbsFor } from "./products";
import type { BonusTier } from "./bonus-shared";

/** ขั้นของแถมที่ใช้ได้ตอนนี้ (เปิดอยู่ + อยู่ในช่วงเวลา + สินค้ายังมีในร้าน) เรียงยอดน้อยไปมาก */
export async function activeBonusRules(now = new Date()): Promise<{ rule: BonusRule; product: Product }[]> {
  const db = await getDb();
  const [rules, products] = await Promise.all([db.select().from(schema.bonusRules).orderBy(asc(schema.bonusRules.minBaht)), listAllProducts()]);
  const byKey = new Map(products.map((p) => [p.passKey, p]));
  const out: { rule: BonusRule; product: Product }[] = [];
  for (const r of rules) {
    const product = byKey.get(r.passKey);
    if (!product || !r.active || r.minBaht <= 0) continue;
    if (r.startsAt && r.startsAt > now) continue;
    if (r.endsAt && r.endsAt <= now) continue;
    out.push({ rule: r, product });
  }
  return out;
}

/** ขั้นสูงสุดที่ยอดนี้ถึง (ได้ขั้นเดียว) */
export function pickBonus<T extends { rule: BonusRule }>(list: T[], paidBaht: number): T | null {
  let best: T | null = null;
  for (const x of list) if (paidBaht >= x.rule.minBaht && (!best || x.rule.minBaht >= best.rule.minBaht)) best = x;
  return best;
}

export function bonusQty(rule: Pick<BonusRule, "qty">, product: Pick<Product, "kind">) {
  return product.kind === "pass" ? 1 : Math.min(99, Math.max(1, rule.qty));
}

/** สำหรับหน้าเว็บ (ตะกร้า / หน้าแรก) */
export async function listBonusTiers(): Promise<BonusTier[]> {
  const list = await activeBonusRules();
  const thumbs = await thumbsFor(list.map((x) => x.product));
  return list.map(({ rule, product }) => ({
    minBaht: rule.minBaht,
    name: product.name,
    qty: bonusQty(rule, product),
    color: product.color,
    iconUrl: iconUrl(product.iconAssetId, thumbs),
    endsAt: rule.endsAt ? rule.endsAt.toISOString() : null,
  }));
}
