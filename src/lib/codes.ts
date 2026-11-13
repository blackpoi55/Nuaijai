import { randomInt } from "node:crypto";

// ไม่มี I O 0 1 ให้อ่านง่าย พิมพ์ไม่ผิด
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LEN = 12;

export function newCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === CODE_LEN ? s : null;
}

export function prettyCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}
