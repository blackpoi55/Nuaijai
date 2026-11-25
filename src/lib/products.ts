import "server-only";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Product } from "@/db/schema";
import { SEED_ITEMS, SEED_PASSES } from "@/data/passes";
import { getThumbs } from "./thumbs";

export type PublicProduct = {
  id: number;
  passKey: string;
  kind: "pass" | "item";
  name: string;
  blurb: string;
  perks: { t: string; d: string }[];
  color: string;
  iconUrl: string | null;
  priceRobux: number;
  featured: boolean;
  saleStart: string | null;
  saleEnd: string | null;
};

/** URL รูปไอคอน: ใช้ URL CDN ที่ขอมาแล้ว (thumbs) ถ้ามี ไม่งั้นใช้ route สำรอง /api/thumb */
export function iconUrl(assetId: number | null | undefined, thumbs?: Map<number, string>) {
  if (!assetId) return null;
  return thumbs?.get(assetId) ?? `/api/thumb/${assetId}`;
}

/** ขอรูปของสินค้าทั้งหมดในครั้งเดียว */
export function thumbsFor(products: Pick<Product, "iconAssetId">[]) {
  return getThumbs(products.map((p) => p.iconAssetId)).catch(() => new Map<number, string>());
}

/** ซื้อได้ตอนนี้ไหม: เปิดอยู่ + ถึงเวลาเปิดขายแล้ว + ยังไม่หมดเวลา */
export function isOnSale(p: Pick<Product, "active" | "saleStart" | "saleEnd">, now = new Date()) {
  return p.active && (!p.saleStart || p.saleStart <= now) && (!p.saleEnd || p.saleEnd > now);
}

/** ยังไม่ถึงเวลาเปิดขาย (โชว์ "เร็วๆ นี้" ได้ แต่ซื้อไม่ได้) */
export function isUpcoming(p: Pick<Product, "active" | "saleStart">, now = new Date()) {
  return p.active && !!p.saleStart && p.saleStart > now;
}

export function toPublic(p: Product, thumbs?: Map<number, string>): PublicProduct {
  return {
    id: p.id,
    passKey: p.passKey,
    kind: p.kind,
    name: p.name,
    blurb: p.blurb,
    perks: p.perks ?? [],
    color: p.color,
    iconUrl: iconUrl(p.iconAssetId, thumbs),
    priceRobux: p.priceRobux,
    featured: p.featured,
    saleStart: p.saleStart ? p.saleStart.toISOString() : null,
    saleEnd: p.saleEnd ? p.saleEnd.toISOString() : null,
  };
}

/** ใส่สินค้าตั้งต้นจากเกมที่ยังไม่มีในตาราง (ทำครั้งเดียวต่อเซิร์ฟเวอร์ ของที่แอดมินแก้แล้วไม่ถูกทับ) */
const g = globalThis as unknown as { __nhSeeded?: Promise<void> };
export function ensureSeeded(): Promise<void> {
  if (!g.__nhSeeded) {
    g.__nhSeeded = seedMissing().catch((e) => {
      g.__nhSeeded = undefined;
      throw e;
    });
  }
  return g.__nhSeeded;
}

async function seedMissing() {
  const db = await getDb();
  const all = [...SEED_PASSES, ...SEED_ITEMS];
  const have = new Set((await db.select({ k: schema.products.passKey }).from(schema.products)).map((r) => r.k));
  const missing = all.filter((p) => !have.has(p.passKey));
  if (missing.length === 0) return;
  await db
    .insert(schema.products)
    .values(
      missing.map((p) => ({
        passKey: p.passKey,
        kind: p.kind ?? "pass",
        robloxProductId: p.robloxProductId,
        name: p.name,
        blurb: p.blurb,
        perks: p.perks,
        color: p.color,
        iconAssetId: p.iconAssetId,
        priceRobux: p.priceRobux,
        sortOrder: p.sortOrder,
        featured: p.featured ?? false,
        active: p.active ?? true,
        saleStart: p.saleStart ? new Date(p.saleStart * 1000) : null,
        saleEnd: p.saleEnd ? new Date(p.saleEnd * 1000) : null,
      })),
    )
    .onConflictDoNothing();
}

export async function listAllProducts(): Promise<Product[]> {
  await ensureSeeded();
  const db = await getDb();
  return db.select().from(schema.products).orderBy(asc(schema.products.sortOrder), asc(schema.products.id));
}

export async function listOnSale(): Promise<PublicProduct[]> {
  const all = await listAllProducts();
  const now = new Date();
  const onSale = all.filter((p) => isOnSale(p, now));
  const thumbs = await thumbsFor(onSale);
  return onSale.map((p) => toPublic(p, thumbs));
}

/** ของที่จะวางขายเร็วๆ นี้ เรียงตามวันเปิดขาย */
export async function listUpcoming(): Promise<PublicProduct[]> {
  const all = await listAllProducts();
  const now = new Date();
  const soon = all.filter((p) => isUpcoming(p, now)).sort((a, b) => a.saleStart!.getTime() - b.saleStart!.getTime() || a.sortOrder - b.sortOrder);
  const thumbs = await thumbsFor(soon);
  return soon.map((p) => toPublic(p, thumbs));
}
