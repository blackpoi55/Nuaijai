import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { User } from "@/db/schema";

const COOKIE = "nh_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** ชื่อผู้ใช้ที่ตั้งใน ADMIN_USERNAMES (คั่นด้วย ,) จะเป็นแอดมินอัตโนมัติ */
export function isEnvAdmin(username: string) {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(username.toLowerCase());
}

export async function createSession(userId: number) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  // เก็บกวาด session หมดอายุของคนนี้
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date())));
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user ?? null;
  if (!user || user.banned) return null;
  return user;
});

export async function requireUser(next = "/"): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "admin") redirect("/");
  return u;
}
