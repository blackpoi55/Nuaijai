"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

// เครื่องหนึ่ง (endpoint) ผูกกับ "บัญชีที่ล็อกอินอยู่บนเครื่องนั้น" เท่านั้น:
// • เปิดรับ/เปิดเว็บใหม่ = ผูกกับบัญชีปัจจุบัน (ย้ายจากบัญชีเก่าถ้ามี)
// • ออกจากระบบ = ลบ endpoint ของเครื่องนั้นทิ้ง (คุกกี้ nh_push_ep บอกว่าเครื่องนี้คือ endpoint ไหน)
const EP_COOKIE = "nh_push_ep";

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  const db = await getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
}

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSubscriptionAction(sub: SubJSON, userAgent: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return { ok: false };
  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth, userAgent: userAgent.slice(0, 300) })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { userId: user.id, p256dh, auth, userAgent: userAgent.slice(0, 300) } });
  const jar = await cookies();
  jar.set(EP_COOKIE, endpoint, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}

/** ยกเลิกรับแจ้งเตือนของเครื่องนี้ (ไม่ต้องล็อกอิน: ใช้ตอนออกจากระบบแล้วด้วย; endpoint รู้ได้เฉพาะเครื่องนั้น) */
export async function removePushSubscriptionAction(endpoint: string) {
  const db = await getDb();
  await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, String(endpoint)));
  const jar = await cookies();
  jar.delete(EP_COOKIE);
}

/** เรียกตอนออกจากระบบ: ตัดเครื่องนี้ออกจากบัญชี */
export async function dropThisDevicePush() {
  const jar = await cookies();
  const ep = jar.get(EP_COOKIE)?.value;
  if (ep) {
    const db = await getDb();
    await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, ep));
    jar.delete(EP_COOKIE);
  }
}
