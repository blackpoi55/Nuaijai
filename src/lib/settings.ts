import "server-only";
import { getDb, schema } from "@/db";
import { DEFAULT_ROBUX_PER_BAHT } from "./pricing";

export type ShopSettings = {
  robuxPerBaht: number;
  shopOpen: boolean;
  angpaoOpen: boolean; // เติมด้วยซองอั่งเปา TrueMoney
  promptpayOpen: boolean; // เติมด้วยพร้อมเพย์ + แนบสลิป
  announcement: string;
  contactUrl: string; // ลิงก์ทักแอดมิน (Discord) ให้ตรวจสลิปเร็ว
  wheelOpen: boolean; // วงล้อเสี่ยงโชค
  bahtPerSpin: number; // ซื้อสะสมกี่บาทได้ 1 สิทธิ์หมุน
};

const DEFAULTS: ShopSettings = {
  robuxPerBaht: DEFAULT_ROBUX_PER_BAHT,
  shopOpen: true,
  angpaoOpen: true,
  promptpayOpen: true,
  announcement: "",
  contactUrl: "https://discord.com/users/335392827938832384",
  wheelOpen: true,
  bahtPerSpin: 100,
};

export async function getSettings(): Promise<ShopSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out: ShopSettings = { ...DEFAULTS };
  for (const r of rows) {
    if (r.key in out) (out as Record<string, unknown>)[r.key] = r.value;
  }
  if (!(out.robuxPerBaht >= 1)) out.robuxPerBaht = DEFAULT_ROBUX_PER_BAHT;
  if (!(out.bahtPerSpin >= 1)) out.bahtPerSpin = 100;
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

/** เบอร์/เลขพร้อมเพย์ (ค่าเริ่มต้น = เบอร์เดียวกับวอลเล็ต) */
export function promptPayId() {
  return (process.env.PROMPTPAY_ID || process.env.TRUEMONEY_PHONE || "").replace(/\D/g, "");
}
