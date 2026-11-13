"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { checkPassword, createSession, destroySession, hashPassword, isEnvAdmin } from "@/lib/auth";
import { clientIpHash } from "@/lib/ip";
import { dropThisDevicePush } from "./notify";

export type FormState = { error?: string; ok?: string } | undefined;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// กันเดารหัส (เก็บในฐานข้อมูล ใช้ได้ทุกเซิร์ฟเวอร์): ผิดติดกัน MAX_FAILS ครั้ง ล็อกบัญชี LOCK_MIN นาที
const MAX_FAILS = 5;
const LOCK_MIN = 10;
// กันปั๊มบัญชี: สมัครได้ไม่เกิน SIGNUPS_PER_IP บัญชีต่อ IP ใน 24 ชม.
const SIGNUPS_PER_IP = 3;

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!USERNAME_RE.test(username)) return { error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ _ ยาว 3–20 ตัว" };
  if (password.length < 6) return { error: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัว" };
  if (password.length > 72) return { error: "รหัสผ่านยาวเกินไป" };
  if (password !== confirm) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  const db = await getDb();
  const lower = username.toLowerCase();
  const ip = await clientIpHash();
  if (ip) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(and(eq(schema.users.signupIp, ip), gt(schema.users.createdAt, new Date(Date.now() - 86400_000))));
    if (n >= SIGNUPS_PER_IP) return { error: "สมัครจากเครื่อง/เน็ตนี้ครบจำนวนต่อวันแล้ว ลองใหม่พรุ่งนี้ หรือติดต่อแอดมิน" };
  }
  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, lower)).limit(1);
  if (exists.length) return { error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" };

  const [u] = await db
    .insert(schema.users)
    .values({
      username: lower,
      displayName: username,
      passwordHash: await hashPassword(password),
      role: isEnvAdmin(lower) ? "admin" : "user",
      lastLoginAt: new Date(),
      signupIp: ip,
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (!u) return { error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" };
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "กรอกชื่อผู้ใช้และรหัสผ่าน" };
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    const min = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `ใส่รหัสผิดหลายครั้ง บัญชีถูกล็อกชั่วคราว ลองใหม่ในอีก ${min} นาที` };
  }
  if (!u || !(await checkPassword(password, u.passwordHash))) {
    if (u) {
      const fails = u.failedLogins + 1;
      await db
        .update(schema.users)
        .set(fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60_000) } : { failedLogins: fails })
        .where(eq(schema.users.id, u.id));
      if (fails >= MAX_FAILS) return { error: `ใส่รหัสผิด ${MAX_FAILS} ครั้ง บัญชีถูกล็อก ${LOCK_MIN} นาที` };
    }
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }
  if (u.banned) return { error: "บัญชีนี้ถูกระงับ ติดต่อแอดมิน" };
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null, ...(isEnvAdmin(u.username) && u.role !== "admin" ? { role: "admin" as const } : {}) })
    .where(eq(schema.users.id, u.id));
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await dropThisDevicePush(); // เครื่องนี้เลิกรับแจ้งเตือนของบัญชีที่ออก
  await destroySession();
  redirect("/");
}
