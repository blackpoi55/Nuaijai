import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

// IP ของผู้ใช้ เก็บเป็น hash (sha256 + salt) — ใช้นับการสมัคร/ใช้คูปองซ้ำ ไม่เก็บ IP จริง
export async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const raw = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim();
  if (!raw) return null;
  const salt = process.env.IP_SALT || process.env.GAME_API_KEY || "nh";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}
