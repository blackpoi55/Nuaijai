import { NextResponse } from "next/server";

// รูปไอคอนของสินค้าจาก Roblox (asset id) → redirect ไปที่ CDN ของ Roblox, แคช 1 วัน
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d{1,20}$/.test(id)) return new NextResponse("bad id", { status: 400 });
  try {
    const r = await fetch(
      `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) },
    );
    const j = await r.json();
    const url: string | undefined = j?.data?.[0]?.imageUrl;
    if (url && j?.data?.[0]?.state === "Completed") {
      return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "public, max-age=86400, s-maxage=86400" } });
    }
    if (url) return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "public, max-age=300" } });
  } catch {}
  return new NextResponse(null, { status: 404, headers: { "cache-control": "public, max-age=300" } });
}
