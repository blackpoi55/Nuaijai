// ปลดล็อกบัญชีจากเครื่องคอม (ใช้ตอนบัญชีแอดมินเองโดนล็อกจนเข้าหลังบ้านไม่ได้)
//   npm run unlock -- <ชื่อผู้ใช้>
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { Pool } from "pg";

async function main() {
  const username = (process.argv[2] ?? "").trim().toLowerCase();
  if (!username) {
    console.log("ใช้แบบนี้: npm run unlock -- <ชื่อผู้ใช้>");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    console.log("ไม่พบ DATABASE_URL ของ Neon ใน .env.local");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const r = await pool.query(
    "UPDATE users SET failed_logins = 0, locked_until = NULL WHERE username = $1 RETURNING display_name",
    [username],
  );
  await pool.end();
  if (r.rowCount) console.log(`ปลดล็อก ${r.rows[0].display_name} แล้ว เข้าสู่ระบบได้เลย`);
  else console.log(`ไม่พบชื่อผู้ใช้ ${username}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
