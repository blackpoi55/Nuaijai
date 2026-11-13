import "server-only";
import { randomInt } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { WheelPrize } from "@/db/schema";

// รางวัลตั้งต้น (ใส่ให้ครั้งแรกถ้าตารางว่าง — แอดมินแก้ได้ที่ /admin/wheel)
const SEED: Omit<typeof schema.wheelPrizes.$inferInsert, "id">[] = [
  { label: "+1 แต้ม", kind: "points", value: 100, weight: 30, color: "#e2c27d", sortOrder: 1 },
  { label: "เกือบได้!", kind: "none", value: 0, weight: 20, color: "#3a332a", sortOrder: 2 },
  { label: "ลด 5%", kind: "coupon", value: 5, couponType: "percent", weight: 6, color: "#c49a55", sortOrder: 3 },
  { label: "+3 แต้ม", kind: "points", value: 300, weight: 20, color: "#f3e3bd", sortOrder: 4 },
  { label: "ตั๋วกาชา ×1", kind: "item", passKey: "gacha_x1", weight: 10, color: "#b88c47", sortOrder: 5 },
  { label: "ลด 10%", kind: "coupon", value: 10, couponType: "percent", weight: 2, color: "#e2c27d", sortOrder: 6 },
  { label: "กล่องฟองแชท", kind: "item", passKey: "box_bubble", weight: 1, color: "#8a6a35", sortOrder: 8 },
];

// รางวัลที่เพิ่มทีหลัง: ใส่ให้ครั้งเดียวตามเวอร์ชัน (แอดมินลบทิ้งแล้วจะไม่กลับมา)
type PrizeRow = Omit<typeof schema.wheelPrizes.$inferInsert, "id">;
const SEED_UPDATES: { version: number; prizes: PrizeRow[]; removeLabels?: string[]; updates?: { label: string; set: Partial<PrizeRow> }[] }[] = [
  {
    version: 2, // 2026-11-13 owner: เพิ่มกล่องเลือกสกินเบ็ด กล่องเลือกฉมวกแฟนซี และตั๋วกาชา
    prizes: [
      { label: "สกินเบ็ด", kind: "item", passKey: "box_rodskin", weight: 1, color: "#c49a55", sortOrder: 9 },
      { label: "ตั๋วกาชา ×3", kind: "item", passKey: "gacha_x1", value: 3, weight: 4, color: "#f3e3bd", sortOrder: 10 },
      { label: "ฉมวกแฟนซี", kind: "item", passKey: "box_fancyharpoon", weight: 1, color: "#8a6a35", sortOrder: 11 },
    ],
  },
  { version: 3, prizes: [], removeLabels: ["+10 แต้ม"] }, // 2026-11-13 owner: เอา +10 แต้มออกจากวงล้อ
  // 2026-11-13 owner: ตั๋วกาชา ×5 → ×3 (ในเกมไม่มีแพ็ก ×3 จึงให้ตั๋ว ×1 จำนวน 3 ใบในโค้ดเดียว)
  { version: 4, prizes: [], updates: [{ label: "ตั๋วกาชา ×5", set: { label: "ตั๋วกาชา ×3", passKey: "gacha_x1", value: 3 } }] },
  // 2026-11-13 owner: สลับโอกาส ลด 10% กับ ตั๋วกาชา ×1
  {
    version: 5,
    prizes: [],
    updates: [
      { label: "ตั๋วกาชา ×1", set: { weight: 6 } },
      { label: "ลด 10%", set: { weight: 4 } },
    ],
  },
  // 2026-11-13 owner: ลด 5% เหลือ 10% — น้ำหนักรวม 100 = อ่านเป็น % ได้ตรงๆ
  {
    version: 6,
    prizes: [],
    updates: [
      { label: "ลด 5%", set: { weight: 10 } },
      { label: "+1 แต้ม", set: { weight: 35 } },
      { label: "เกือบได้!", set: { weight: 20 } },
    ],
  },
  // 2026-11-13 owner: เพิ่มบัตรแกล้งเด็กดื้อ (5%) — ดึงโอกาสมาจาก +1 แต้ม
  {
    version: 7,
    prizes: [{ label: "บัตรแกล้ง", kind: "item", passKey: "prank_card", value: 1, weight: 5, color: "#e2c27d", sortOrder: 12 }],
    updates: [{ label: "+1 แต้ม", set: { weight: 30 } }],
  },
  // 2026-11-13 owner: สลับโอกาส ลด 10% กับ ตั๋วกาชา ×3
  {
    version: 8,
    prizes: [],
    updates: [
      { label: "ลด 10%", set: { weight: 2 } },
      { label: "ตั๋วกาชา ×3", set: { weight: 4 } },
    ],
  },
  // 2026-11-13 owner: สลับโอกาส ลด 5% กับ ตั๋วกาชา ×1
  {
    version: 9,
    prizes: [],
    updates: [
      { label: "ลด 5%", set: { weight: 6 } },
      { label: "ตั๋วกาชา ×1", set: { weight: 10 } },
    ],
  },
];
const SEED_VERSION = Math.max(1, ...SEED_UPDATES.map((u) => u.version));

const g = globalThis as unknown as { __nhWheelSeeded?: Promise<void> };
export function ensureWheelSeeded() {
  if (!g.__nhWheelSeeded) {
    g.__nhWheelSeeded = (async () => {
      const db = await getDb();
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.wheelPrizes);
      const [ver] = await db.select().from(schema.settings).where(eq(schema.settings.key, "wheelSeedVersion")).limit(1);
      let have = Number(ver?.value ?? 0);
      if (n === 0) {
        const remove = new Set(SEED_UPDATES.flatMap((u) => u.removeLabels ?? []));
        await db.insert(schema.wheelPrizes).values([...SEED, ...SEED_UPDATES.flatMap((u) => u.prizes)].filter((p) => !remove.has(p.label)));
        have = SEED_VERSION;
      } else {
        if (have < 1) have = 1; // วงล้อที่มีอยู่แล้วก่อนระบบเวอร์ชัน = มีชุดแรกครบแล้ว
        for (const u of SEED_UPDATES) {
          if (u.version <= have) continue;
          if (u.prizes.length) await db.insert(schema.wheelPrizes).values(u.prizes);
          for (const label of u.removeLabels ?? []) await db.delete(schema.wheelPrizes).where(eq(schema.wheelPrizes.label, label));
          for (const up of u.updates ?? []) await db.update(schema.wheelPrizes).set(up.set).where(eq(schema.wheelPrizes.label, up.label));
        }
        have = SEED_VERSION;
      }
      if (Number(ver?.value ?? 0) !== have)
        await db
          .insert(schema.settings)
          .values({ key: "wheelSeedVersion", value: have })
          .onConflictDoUpdate({ target: schema.settings.key, set: { value: have, updatedAt: new Date() } });
    })().catch((e) => {
      g.__nhWheelSeeded = undefined;
      throw e;
    });
  }
  return g.__nhWheelSeeded;
}

export async function listPrizes(): Promise<WheelPrize[]> {
  await ensureWheelSeeded();
  const db = await getDb();
  return db.select().from(schema.wheelPrizes).orderBy(asc(schema.wheelPrizes.sortOrder), asc(schema.wheelPrizes.id));
}

/** รางวัลที่ออกได้ตอนนี้ (เปิดอยู่ มีโอกาส > 0 และยังไม่หมดสต็อก) */
export function available(prizes: WheelPrize[]) {
  return prizes.filter((p) => p.active && p.weight > 0 && (p.stock === null || p.stock > 0));
}

/** สุ่มตามน้ำหนัก (crypto) */
export function pickPrize(prizes: WheelPrize[]): WheelPrize | null {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return null;
  let r = randomInt(total);
  for (const p of prizes) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return prizes[prizes.length - 1] ?? null;
}

export type PublicPrize = { id: number; label: string; kind: string; color: string; chance: number; image: string | null; qty: number };
/** images: passKey → URL รูปไอเทม (ใช้กับรางวัลแบบไอเทม) */
export function toPublicPrizes(prizes: WheelPrize[], images: Record<string, string> = {}): PublicPrize[] {
  const total = prizes.reduce((s, p) => s + p.weight, 0) || 1;
  return prizes.map((p) => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
    color: p.color,
    chance: (p.weight / total) * 100,
    image: p.kind === "item" && p.passKey ? (images[p.passKey] ?? null) : null,
    qty: itemQty(p),
  }));
}

/** จำนวนชิ้นของรางวัลแบบไอเทม (value = จำนวน, ขั้นต่ำ 1) */
export function itemQty(p: Pick<WheelPrize, "kind" | "value">) {
  return p.kind === "item" ? Math.min(50, Math.max(1, p.value || 1)) : 1;
}
