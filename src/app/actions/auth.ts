"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { checkPassword, createSession, destroySession, hashPassword, isEnvAdmin } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// กันเดารหัส: ผิดเกิน 8 ครั้งใน 10 นาที ต่อชื่อผู้ใช้ (ในหน่วยความจำของเซิร์ฟเวอร์)
const fails = new Map<string, { n: number; t: number }>();
function tooMany(key: string) {
  const f = fails.get(key);
  return !!f && f.n >= 8 && Date.now() - f.t < 600_000;
}
function addFail(key: string) {
  const f = fails.get(key);
  if (!f || Date.now() - f.t > 600_000) fails.set(key, { n: 1, t: Date.now() });
  else f.n++;
}

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
  if (tooMany(username)) return { error: "ลองผิดหลายครั้งเกินไป รอ 10 นาทีแล้วลองใหม่" };

  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  if (!u || !(await checkPassword(password, u.passwordHash))) {
    addFail(username);
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }
  if (u.banned) return { error: "บัญชีนี้ถูกระงับ ติดต่อแอดมิน" };
  fails.delete(username);
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date(), ...(isEnvAdmin(u.username) && u.role !== "admin" ? { role: "admin" as const } : {}) })
    .where(eq(schema.users.id, u.id));
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
