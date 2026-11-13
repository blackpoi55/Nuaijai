import { NextResponse } from "next/server";
import { getThumb } from "@/lib/thumbs";

// รูปไอคอน (สำรอง) → redirect ไปที่ CDN ของ Roblox
// หน้าเว็บปกติได้ URL รูปตรงจาก getThumbs แล้ว route นี้ใช้เฉพาะรูปที่ยังไม่ได้ตอนโหลดหน้า
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d{1,20}$/.test(id)) return new NextResponse("bad id", { status: 400 });
  const url = await getThumb(Number(id));
  if (url) return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "public, max-age=86400, s-maxage=86400" } });
  // ห้ามแคชตอนพลาด ไม่งั้นรูปจะหายค้างไปนาน
  return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
}
