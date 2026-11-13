import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// รูปสลิป: ดูได้เฉพาะแอดมินกับเจ้าของสลิป
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [s] = await db
    .select({ userId: schema.slips.userId, imageData: schema.slips.imageData })
    .from(schema.slips)
    .where(eq(schema.slips.id, Number(id) || 0))
    .limit(1);
  if (!s || (user.role !== "admin" && s.userId !== user.id)) return new Response("not found", { status: 404 });
  const m = s.imageData.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return new Response("bad image", { status: 500 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "content-type": m[1], "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
