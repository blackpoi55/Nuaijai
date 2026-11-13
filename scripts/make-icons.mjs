// สร้างไอคอนแอปจากรูปต้นฉบับ: node scripts/make-icons.mjs [รูปต้นฉบับ]
// ค่าเริ่มต้นใช้ brand/app-icon.webp (รูปปกแมพเหนื่อยใจ) — ได้ public/icons/*, src/app/icon.png, src/app/apple-icon.png
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = process.argv[2] || "brand/app-icon.webp";
mkdirSync("public/icons", { recursive: true });
mkdirSync("brand", { recursive: true });

const base = sharp(src).resize(1024, 1024, { fit: "cover" });
const buf = await base.png().toBuffer();

// เก็บต้นฉบับย่อไว้ใน repo (ไฟล์เล็ก)
if (src !== "brand/app-icon.webp") await sharp(buf).webp({ quality: 90 }).toFile("brand/app-icon.webp");

const png = (size, out) => sharp(buf).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(out);
await png(512, "public/icons/512.png");
await png(192, "public/icons/192.png");
// src/app/icon.png = favicon ขนาดใหญ่ (วาดด้านล่าง)
await png(180, "src/app/apple-icon.png");

// maskable: ระบบตัดเป็นวงกลม/สี่เหลี่ยมมน — ย่อรูปไว้กลาง 80% บนพื้นเป็นรูปเดิมเบลอ
const bg = await sharp(buf).resize(512, 512).blur(24).modulate({ brightness: 0.8 }).png().toBuffer();
const fg = await sharp(buf).resize(410, 410).png().toBuffer();
await sharp(bg).composite([{ input: fg, gravity: "center" }]).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile("public/icons/maskable-512.png");

// badge แจ้งเตือน Android: รูปขาวล้วนบนพื้นใส (ใบไม้)
const leaf = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-3 -3 30 30" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
await sharp(Buffer.from(leaf)).png().toFile("public/icons/badge-96.png");

// favicon.ico บนแท็บเบราว์เซอร์: 16/32/48 px (PNG ใส่ในไฟล์ ICO) ย่อแล้วเพิ่มความคมให้ดูชัดตอนเล็ก
// (รูปปกเต็มใบย่อเหลือ 16–32px จะเป็นสีปนกันอ่านไม่ออก — favicon เลยวาดใหม่: พื้นไล่สีพระอาทิตย์ตกแบบในรูปปก + ใบไม้สีครีม)
const fav = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffcf5a"/><stop offset="0.5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e8478f"/>
    </linearGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9be15d"/><stop offset="1" stop-color="#2e9e4f"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#g)"/>
  <g transform="translate(9 8) scale(1.95)">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="url(#l)" stroke="#fff7e6" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" fill="none" stroke="#fff7e6" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(Buffer.from(fav(s))).png().toBuffer()));
await sharp(Buffer.from(fav(96))).png().toFile("src/app/icon.png"); // แท็บจอความละเอียดสูง
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
const { writeFileSync } = await import("node:fs");
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...dir, ...pngs]));

console.log("icons ok");
