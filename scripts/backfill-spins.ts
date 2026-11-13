// ให้สิทธิ์หมุนวงล้อย้อนหลัง จากยอดซื้อจริงก่อนมีวงล้อ (ทำได้ครั้งเดียว)
//   npm run backfill:spins            ดูก่อนว่าใครจะได้กี่สิทธิ์ (ยังไม่บันทึก)
//   npm run backfill:spins -- --apply บันทึกจริง + แจ้งเตือนในเว็บ
// นับเฉพาะคำสั่งซื้อจากร้าน (ไม่นับรางวัลวงล้อ / รายการเทสของแอดมิน) หักโค้ดที่แอดมินยกเลิกแล้วคืนแต้ม
// ต้องรันก่อนขึ้นเว็บเวอร์ชันที่มีวงล้อ ไม่งั้นยอดซื้อหลังเปิดวงล้อจะถูกนับซ้ำ
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import path from "node:path";
import { Pool } from "pg";

type Q = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

const DONE_KEY = "spinBackfillDone";

async function connect(): Promise<{ q: Q; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) {
    const pool = new Pool({ connectionString: url, max: 1 });
    const client = await pool.connect();
    return {
      q: (s, p) => client.query(s, p as unknown[]),
      close: async () => {
        client.release();
        await pool.end();
      },
    };
  }
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(path.resolve(url.slice("pglite:".length)));
    return { q: (s, p) => db.query(s, p) as never, close: () => db.close() };
  }
  console.log("ไม่พบ DATABASE_URL");
  process.exit(1);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { q, close } = await connect();
  try {
    const done = await q("SELECT value FROM settings WHERE key = $1", [DONE_KEY]);
    if (done.rows.length) {
      console.log(`ให้สิทธิ์ย้อนหลังไปแล้วเมื่อ ${String(done.rows[0].value)} — ไม่ทำซ้ำ`);
      return;
    }
    const st = await q("SELECT value FROM settings WHERE key = 'bahtPerSpin'");
    const per = Math.max(1, Number(st.rows[0]?.value ?? 100) || 100);

    const { rows } = await q(
      `WITH spent AS (
         SELECT user_id, SUM(total_baht)::int AS baht FROM orders
         WHERE source = 'shop' AND is_test = false GROUP BY user_id
       ), refunded AS (
         SELECT l.user_id, (SUM(l.delta) / 100)::int AS baht FROM point_ledger l
         JOIN codes c ON c.id = l.ref_id
         WHERE l.kind = 'refund' AND l.note LIKE 'คืนแต้มโค้ด%' AND c.is_test = false
         GROUP BY l.user_id
       )
       SELECT u.id, u.username, u.display_name AS name, u.spin_credits AS credits, u.spin_progress AS progress,
              GREATEST(0, s.baht - COALESCE(r.baht, 0))::int AS net
       FROM users u JOIN spent s ON s.user_id = u.id LEFT JOIN refunded r ON r.user_id = u.id
       WHERE u.role <> 'admin'
       ORDER BY net DESC`,
    );

    const plan = rows
      .map((r) => {
        const total = Number(r.progress) + Number(r.net);
        return { id: Number(r.id), username: String(r.username), name: String(r.name), net: Number(r.net), spins: Math.floor(total / per), progress: total % per };
      })
      .filter((p) => p.net > 0);

    console.log(`ทุก ฿${per} = 1 สิทธิ์ • ผู้ซื้อ ${plan.length} คน • รวม ${plan.reduce((a, p) => a + p.spins, 0)} สิทธิ์`);
    console.table(plan.map((p) => ({ ผู้ใช้: p.username, "ยอดซื้อ ฿": p.net, "ได้สิทธิ์": p.spins, "สะสมต่อ ฿": p.progress })));

    if (!apply) {
      console.log("ยังไม่ได้บันทึก — ใส่ --apply เพื่อให้สิทธิ์จริง");
      return;
    }
    await q("BEGIN");
    try {
      // จองคีย์ก่อน กันรันซ้อนกันสองครั้ง
      await q("INSERT INTO settings (key, value) VALUES ($1, to_jsonb(now()::text))", [DONE_KEY]);
      for (const p of plan) {
        await q("UPDATE users SET spin_credits = spin_credits + $2, spin_progress = $3 WHERE id = $1", [p.id, p.spins, p.progress]);
        if (p.spins > 0)
          await q("INSERT INTO notifications (user_id, title, body, url) VALUES ($1, $2, $3, '/wheel')", [
            p.id,
            `🎡 ได้สิทธิ์หมุนวงล้อย้อนหลัง +${p.spins}`,
            `ขอบคุณที่อุดหนุน — ยอดซื้อก่อนหน้านี้ ฿${p.net.toLocaleString("th-TH")} แลกเป็นสิทธิ์หมุนให้แล้ว`,
          ]);
      }
      await q("COMMIT");
    } catch (e) {
      await q("ROLLBACK");
      throw e;
    }
    console.log("บันทึกแล้ว ✓");
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
