import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { normalizeCode } from "@/lib/codes";
import { notifyUser } from "@/lib/notify";

// เรียกจากเซิร์ฟเวอร์เกม (HttpService) เท่านั้น — ต้องมี header x-api-key = GAME_API_KEY
// body: { code, userId, name?, displayName?, owned?: string[] }
// ตอบ: { ok: true, passes: string[] } | { ok: false, error: "nocode" | "used" | "owned" | "bad" , passes? }
// เรียกซ้ำด้วย userId เดิมได้ผลเดิม (กันเน็ตหลุดกลางทาง)

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
  const code = normalizeCode(body?.code);
  const userId = Number(body?.userId);
  const owned: string[] = Array.isArray(body?.owned) ? body.owned.filter((x: unknown) => typeof x === "string") : [];
  if (!code || !Number.isSafeInteger(userId) || userId <= 0) return NextResponse.json({ ok: false, error: "bad" });
  const name = cleanName(body?.name);
  const displayName = cleanDisplay(body?.displayName);

  const db = await getDb();
  const [c] = await db.select().from(schema.codes).where(eq(schema.codes.code, code)).limit(1);
  if (!c || c.status === "revoked") return NextResponse.json({ ok: false, error: "nocode" });

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

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  return NextResponse.json({ ok: true, pong: Date.now() });
}
