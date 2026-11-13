import "server-only";
import { eq, inArray } from "drizzle-orm";
import * as webpush from "web-push";
import { getDb, schema } from "@/db";

// แจ้งเตือน = แถวในตาราง notifications (กระดิ่งในเว็บ) + Web Push ไปทุกเครื่องที่คนนั้นเปิดรับไว้
// ไม่ throw: ถ้าส่งไม่ได้ งานหลัก (อนุมัติสลิป ซื้อของ ฯลฯ) ต้องสำเร็จอยู่ดี

// important = ค้างบนจอจนกว่าจะกด + สั่นแรง (ใช้กับแจ้งเตือนของแอดมิน) • action = ข้อความปุ่มในแจ้งเตือน
export type Note = { title: string; body?: string; url?: string; tag?: string; important?: boolean; action?: string };

let vapidReady: boolean | null = null;
export function pushEnabled() {
  if (vapidReady === null) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    try {
      if (pub && priv) {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://nuaijaimarket.vercel.app", pub, priv);
        vapidReady = true;
      } else vapidReady = false;
    } catch (e) {
      console.error("VAPID setup failed", e);
      vapidReady = false;
    }
  }
  return vapidReady;
}

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

async function pushTo(userIds: number[], n: Note) {
  if (!pushEnabled() || userIds.length === 0) return;
  const db = await getDb();
  const subs = await db.select().from(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.userId, userIds));
  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.url ?? "/",
    tag: n.tag,
    image: "/icons/banner.jpg", // Android: รูปใหญ่ตอนดึงแจ้งเตือนลง
    important: !!n.important,
    action: n.action ?? "เปิดดู",
  });
  const dead: number[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // เครื่องนั้นยกเลิกรับแล้ว
        else console.error("push failed", code, (e as Error).message);
      }
    }),
  );
  if (dead.length) await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.id, dead));
}

export async function notifyUsers(userIds: number[], n: Note) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  try {
    const db = await getDb();
    await db.insert(schema.notifications).values(ids.map((userId) => ({ userId, title: n.title, body: n.body ?? "", url: n.url ?? "/" })));
    await pushTo(ids, n);
  } catch (e) {
    console.error("notify failed", e);
  }
}

export function notifyUser(userId: number, n: Note) {
  return notifyUsers([userId], n);
}

export async function notifyAdmins(n: Note) {
  try {
    const db = await getDb();
    const admins = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin"));
    await notifyUsers(
      admins.map((a) => a.id),
      { important: true, ...n },
    );
  } catch (e) {
    console.error("notifyAdmins failed", e);
  }
}
