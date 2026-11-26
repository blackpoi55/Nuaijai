import { timingSafeEqual } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { normalizeCode, normalizeGiftCode } from "@/lib/codes";
import { notifyUser } from "@/lib/notify";

// เรียกจากเซิร์ฟเวอร์เกม (HttpService) เท่านั้น — ต้องมี header x-api-key = GAME_API_KEY
// body: { code, userId, name?, displayName?, owned?: string[], level?: number }
// ตอบ: { ok: true, passes: string[] } | { ok: false, error: "nocode" | "used" | "owned" | "bad" | "level" | "expired" | "notyet" | "soldout", passes?, need? }
// เรียกซ้ำด้วย userId เดิมได้ผลเดิม (กันเน็ตหลุดกลางทาง)
// โค้ด 2 แบบ: โค้ดที่ซื้อ (12 ตัว ใช้ได้ครั้งเดียว) • โค้ดแจกของแอดมิน (gift_codes: หลายคน คนละครั้ง จำกัดเลเวล/เวลาได้)

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const want = process.env.GAME_API_KEY ?? "";
  const got = req.headers.get("x-api-key") ?? "";
  if (want.length < 16 || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

const cleanName = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_]{3,20}$/.test(v) ? v : null);
const cleanDisplay = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null);

// ชื่อจาก Roblox ด้วยไอดี (ใช้เมื่อเกมไม่ได้ส่งชื่อมา)
async function lookupRoblox(userId: number): Promise<{ name: string | null; displayName: string | null }> {
  try {
    const r = await fetch(`https://users.roblox.com/v1/users/${userId}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { name: null, displayName: null };
    const j = await r.json();
    return { name: cleanName(j?.name), displayName: cleanDisplay(j?.displayName) };
  } catch {
    return { name: null, displayName: null };
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad" }, { status: 400 });
  }
  const gift = normalizeGiftCode(body?.code);
  const code = normalizeCode(body?.code);
  const userId = Number(body?.userId);
  const owned: string[] = Array.isArray(body?.owned) ? body.owned.filter((x: unknown) => typeof x === "string") : [];
  if (!gift || !Number.isSafeInteger(userId) || userId <= 0) return NextResponse.json({ ok: false, error: "bad" });
  const name = cleanName(body?.name);
  const displayName = cleanDisplay(body?.displayName);
  const lv = Number(body?.level);
  const level = Number.isFinite(lv) && lv >= 0 ? Math.floor(lv) : null;

  const db = await getDb();
  const [c] = code ? await db.select().from(schema.codes).where(eq(schema.codes.code, code)).limit(1) : [];
  if (!c) return redeemGift(gift, userId, owned, level, name, displayName);
  if (c.status === "revoked") return NextResponse.json({ ok: false, error: "nocode" });

  if (c.status === "used") {
    if (c.usedByRobloxId === userId) return NextResponse.json({ ok: true, passes: c.passKeys, again: true });
    return NextResponse.json({ ok: false, error: "used" });
  }

  const dup = c.passKeys.filter((k) => owned.includes(k));
  if (dup.length) return NextResponse.json({ ok: false, error: "owned", passes: dup });

  const [claimed] = await db
    .update(schema.codes)
    .set({ status: "used", usedByRobloxId: userId, usedByName: name, usedByDisplayName: displayName, usedAt: new Date() })
    .where(and(eq(schema.codes.id, c.id), eq(schema.codes.status, "active")))
    .returning({ passKeys: schema.codes.passKeys });
  if (!claimed) {
    const [again] = await db.select().from(schema.codes).where(eq(schema.codes.id, c.id)).limit(1);
    if (again?.status === "used" && again.usedByRobloxId === userId) return NextResponse.json({ ok: true, passes: again.passKeys, again: true });
    return NextResponse.json({ ok: false, error: "used" });
  }

  after(async () => {
    let n = name;
    let d = displayName;
    if (!n) {
      const r = await lookupRoblox(userId);
      n = r.name;
      d = d ?? r.displayName;
      if (n) await db.update(schema.codes).set({ usedByName: n, usedByDisplayName: d }).where(eq(schema.codes.id, c.id));
    }
    // บอกผู้ซื้อว่าโค้ดของเขาถูกใช้แล้ว โดยใคร
    await notifyUser(c.userId, {
      title: `🎟️ โค้ด ${c.label} ถูกใช้แล้ว`,
      body: `โดย ${n ? `@${n}${d && d !== n ? ` (${d})` : ""}` : "ผู้เล่น"} • Roblox ID ${userId}`,
      url: "/orders",
    });
  });

  return NextResponse.json({ ok: true, passes: claimed.passKeys });
}

/** โค้ดแจกของแอดมิน: คนละครั้งต่อ Roblox ID, ครบจำนวนแล้วปิดเอง */
async function redeemGift(code: string, userId: number, owned: string[], level: number | null, name: string | null, displayName: string | null) {
  const db = await getDb();
  const [g] = await db.select().from(schema.giftCodes).where(eq(schema.giftCodes.code, code)).limit(1);
  if (!g || !g.active) return NextResponse.json({ ok: false, error: "nocode" });

  const [mine] = await db
    .select({ id: schema.giftRedemptions.id })
    .from(schema.giftRedemptions)
    .where(and(eq(schema.giftRedemptions.giftId, g.id), eq(schema.giftRedemptions.robloxId, userId)))
    .limit(1);
  if (mine) return NextResponse.json({ ok: true, passes: g.passKeys, again: true });

  const now = new Date();
  if (g.startsAt && g.startsAt > now) return NextResponse.json({ ok: false, error: "notyet" });
  if (g.expiresAt && g.expiresAt <= now) return NextResponse.json({ ok: false, error: "expired" });
  // เซิร์ฟเวอร์เกมรุ่นเก่าไม่ส่งเลเวลมา → โค้ดที่จำกัดเลเวลใช้ไม่ได้ (ปลอดภัยไว้ก่อน)
  if (g.minLevel > 0 && (level === null || level < g.minLevel)) return NextResponse.json({ ok: false, error: "level", need: g.minLevel });
  if (g.usedCount >= g.maxUses) return NextResponse.json({ ok: false, error: "soldout" });
  const dup = g.passKeys.filter((k) => owned.includes(k));
  if (dup.length) return NextResponse.json({ ok: false, error: "owned", passes: dup });

  const res = await db.transaction(async (tx) => {
    const [slot] = await tx
      .update(schema.giftCodes)
      .set({ usedCount: sql`${schema.giftCodes.usedCount} + 1` })
      .where(and(eq(schema.giftCodes.id, g.id), eq(schema.giftCodes.active, true), lt(schema.giftCodes.usedCount, schema.giftCodes.maxUses)))
      .returning({ id: schema.giftCodes.id });
    if (!slot) return "soldout" as const;
    const [row] = await tx
      .insert(schema.giftRedemptions)
      .values({ giftId: g.id, robloxId: userId, name, displayName, level })
      .onConflictDoNothing()
      .returning({ id: schema.giftRedemptions.id });
    if (!row) throw new Error("AGAIN"); // อีกคำขอของคนเดิมเพิ่งได้ไป — ยกเลิกการนับซ้ำ
    return "ok" as const;
  }).catch((e) => {
    if (e instanceof Error && e.message === "AGAIN") return "again" as const;
    throw e;
  });
  if (res === "soldout") return NextResponse.json({ ok: false, error: "soldout" });
  if (res === "again") return NextResponse.json({ ok: true, passes: g.passKeys, again: true });

  if (!name)
    after(async () => {
      const r = await lookupRoblox(userId);
      if (r.name)
        await db
          .update(schema.giftRedemptions)
          .set({ name: r.name, displayName: displayName ?? r.displayName })
          .where(and(eq(schema.giftRedemptions.giftId, g.id), eq(schema.giftRedemptions.robloxId, userId)));
    });
  return NextResponse.json({ ok: true, passes: g.passKeys });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  return NextResponse.json({ ok: true, pong: Date.now() });
}
