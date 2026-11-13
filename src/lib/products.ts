import "server-only";
import { asc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Product } from "@/db/schema";
import { SEED_PASSES } from "@/data/passes";

export type PublicProduct = {
  id: number;
  passKey: string;
  name: string;
  blurb: string;
  perks: { t: string; d: string }[];
  color: string;
  iconUrl: string | null;
  priceRobux: number;
  featured: boolean;
  saleEnd: string | null;
};

export function iconUrl(assetId: number | null | undefined) {
  return assetId ? `/api/thumb/${assetId}` : null;
}

export function isOnSale(p: Pick<Product, "active" | "saleEnd">, now = new Date()) {
  return p.active && (!p.saleEnd || p.saleEnd > now);
}

export function toPublic(p: Product): PublicProduct {
  return {
    id: p.id,
    passKey: p.passKey,
    name: p.name,
    blurb: p.blurb,
    perks: p.perks ?? [],
    color: p.color,
    iconUrl: iconUrl(p.iconAssetId),
    priceRobux: p.priceRobux,
    featured: p.featured,
    saleEnd: p.saleEnd ? p.saleEnd.toISOString() : null,
  };
}

/** ใส่พาสตั้งต้นจากเกม ถ้าตารางยังว่าง */
export async function ensureSeeded() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products);
  if (n > 0) return;
  await db
    .insert(schema.products)
    .values(
      SEED_PASSES.map((p) => ({
        passKey: p.passKey,
        robloxProductId: p.robloxProductId,
        name: p.name,
        blurb: p.blurb,
        perks: p.perks,
        color: p.color,
        iconAssetId: p.iconAssetId,
        priceRobux: p.priceRobux,
        sortOrder: p.sortOrder,
        featured: p.featured ?? false,
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
  return all.filter((p) => isOnSale(p, now)).map(toPublic);
}
