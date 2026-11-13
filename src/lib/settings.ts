import "server-only";
import { getDb, schema } from "@/db";
import { DEFAULT_ROBUX_PER_BAHT } from "./pricing";

export type ShopSettings = {
  robuxPerBaht: number;
  shopOpen: boolean;
  topupOpen: boolean;
  announcement: string;
};

const DEFAULTS: ShopSettings = {
  robuxPerBaht: DEFAULT_ROBUX_PER_BAHT,
  shopOpen: true,
  topupOpen: true,
  announcement: "",
};

export async function getSettings(): Promise<ShopSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out: ShopSettings = { ...DEFAULTS };
  for (const r of rows) {
    if (r.key in out) (out as Record<string, unknown>)[r.key] = r.value;
  }
  if (!(out.robuxPerBaht >= 1)) out.robuxPerBaht = DEFAULT_ROBUX_PER_BAHT;
  return out;
}

export async function saveSettings(patch: Partial<ShopSettings>) {
  const db = await getDb();
  for (const [key, value] of Object.entries(patch)) {
    await db
      .insert(schema.settings)
      .values({ key, value: value as never })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: value as never, updatedAt: new Date() } });
  }
}
