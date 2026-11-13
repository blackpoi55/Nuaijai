import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// กระดิ่ง: จำนวนที่ยังไม่อ่าน + 15 รายการล่าสุด
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unread: 0, items: [] }, { status: 401 });
  const db = await getDb();
  const [[{ n }], items] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt))),
    db
      .select({
        id: schema.notifications.id,
        title: schema.notifications.title,
        body: schema.notifications.body,
        url: schema.notifications.url,
        readAt: schema.notifications.readAt,
        createdAt: schema.notifications.createdAt,
      })
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id))
      .orderBy(desc(schema.notifications.id))
      .limit(15),
  ]);
  return NextResponse.json({ unread: n, items }, { headers: { "cache-control": "no-store" } });
}
