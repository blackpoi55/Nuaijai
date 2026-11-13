// npm run db:migrate — สร้าง/อัปเดตตารางใน Neon ตาม drizzle/*.sql
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    console.log("DATABASE_URL ไม่ใช่ Postgres — ถ้าใช้ PGlite ในเครื่อง ตารางจะถูกสร้างเองตอนเปิดเว็บ");
    return;
  }
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
  console.log("migrate เสร็จแล้ว");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
