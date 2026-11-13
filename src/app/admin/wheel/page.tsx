import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listAllProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { listPrizes } from "@/lib/wheel";
import { PageTitle, StatTile, Table, thaiDate } from "../ui";
import { GrantForm, PrizeForm, PrizeRow, WheelSettings } from "./client";

export default async function AdminWheel() {
  const [prizes, st, products] = await Promise.all([listPrizes(), getSettings(), listAllProducts()]);
  const db = await getDb();
  const [[stats], recent] = await Promise.all([
    db
      .select({
        spins: sql<number>`count(*)::int`,
        today: sql<number>`count(*) filter (where ${schema.wheelSpins.createdAt} > now() - interval '1 day')::int`,
      })
      .from(schema.wheelSpins),
    db
      .select({ s: schema.wheelSpins, u: schema.users.displayName, uid: schema.users.id })
      .from(schema.wheelSpins)
      .innerJoin(schema.users, eq(schema.wheelSpins.userId, schema.users.id))
      .orderBy(desc(schema.wheelSpins.id))
      .limit(10),
  ]);
  const [{ credits }] = await db.select({ credits: sql<number>`coalesce(sum(${schema.users.spinCredits}),0)::int` }).from(schema.users);
  const live = prizes.filter((p) => p.active && p.weight > 0 && (p.stock === null || p.stock > 0));
  const total = live.reduce((s, p) => s + p.weight, 0) || 1;
  const items = products.map((p) => ({ passKey: p.passKey, name: p.name }));

  return (
    <div>
      <PageTitle
        title="วงล้อนำโชค"
        sub="ผู้เล่นได้สิทธิ์หมุนจากยอดซื้อเท่านั้น ไม่มีการจ่ายเพื่อหมุน"
        right={
          <Link href="/admin/wheel/history" className="btn btn-primary !py-2 text-sm">
            ใครหมุนได้อะไร →
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="หมุนทั้งหมด" value={String(stats.spins)} />
        <StatTile label="หมุน 24 ชม." value={String(stats.today)} />
        <StatTile label="สิทธิ์ค้างในระบบ" value={String(credits)} />
        <StatTile label="รางวัลบนวง" value={String(live.length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <WheelSettings open={st.wheelOpen} bahtPerSpin={st.bahtPerSpin} />
        <GrantForm />
      </div>

      <h2 className="mb-3 mt-8 font-semibold">รางวัล</h2>
      <div className="space-y-2">
        {prizes.map((p) => (
          <PrizeRow key={p.id} prize={p} chance={live.includes(p) ? (p.weight / total) * 100 : 0} items={items} />
        ))}
      </div>
      <div className="mt-4">
        <PrizeForm items={items} />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-semibold">ที่หมุนได้ล่าสุด</h2>
        <Link href="/admin/wheel/history" className="text-sm text-gold hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>
      <Table head={["เวลา", "ผู้ใช้", "รางวัล", "โค้ดที่ได้"]} empty={recent.length === 0}>
        {recent.map(({ s, u, uid }) => (
          <tr key={s.id}>
            <td className="text-xs text-muted">{thaiDate.format(s.createdAt)}</td>
            <td>
              <Link href={`/admin/users/${uid}`} className="hover:underline">
                {u}
              </Link>
            </td>
            <td className={s.kind === "none" ? "text-dim" : ""}>{s.label}</td>
            <td className="font-mono text-xs">{s.reward ?? "-"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
