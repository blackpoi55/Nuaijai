import "server-only";
import path from "node:path";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

// DATABASE_URL ของ Neon (postgres://...) ใช้ pg ปกติ
// ถ้าไม่ตั้ง หรือขึ้นต้นด้วย "pglite:" จะใช้ฐานข้อมูลในเครื่อง (PGlite) สำหรับทดสอบ — สร้างตารางให้อัตโนมัติ
const g = globalThis as unknown as { __nhDb?: Promise<DB> };

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) {
    // SSL ตาม sslmode ใน URL (Neon ใช้ sslmode=verify-full)
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzlePg(pool, { schema });
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE !== "1") {
    throw new Error("DATABASE_URL is not set");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = url.startsWith("pglite:") ? url.slice("pglite:".length) : ".pglite";
  const client = new PGlite(path.resolve(dir));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__nhDb) {
    g.__nhDb = create().catch((e) => {
      g.__nhDb = undefined;
      throw e;
    });
  }
  return g.__nhDb;
}

export { schema };
