import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatBaht, formatNumber } from "@/lib/pricing";
import { PageTitle, StatTile, Status, Table, thaiDate } from "./ui";

function startOfBangkokDay(daysAgo = 0) {
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  bkk.setUTCHours(0, 0, 0, 0);
  return new Date(bkk.getTime() - 7 * 3600_000 - daysAgo * 86400_000);
}

export default async function AdminHome() {
  const db = await getDb();
  const today = startOfBangkokDay();
  const week = startOfBangkokDay(6);

  const sumTopup = (from?: Date) =>
    db
      .select({ v: sql<number>`coalesce(sum(${schema.topups.amount}),0)::int`, n: sql<number>`count(*)::int` })
      .from(schema.topups)
      .where(and(eq(schema.topups.status, "success"), from ? gte(schema.topups.createdAt, from) : undefined));
  const sumSales = (from?: Date) =>
    db
      .select({ v: sql<number>`coalesce(sum(${schema.orders.totalBaht}),0)::int`, n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(from ? gte(schema.orders.createdAt, from) : undefined);

  const [[tToday], [tWeek], [tAll], [sToday], [sWeek], [users], [codeStats], recentTopups, recentOrders, recentOrderItems] = await Promise.all([
    sumTopup(today),
    sumTopup(week),
    sumTopup(),
    sumSales(today),
    sumSales(week),
    db.select({ n: sql<number>`count(*)::int`, pts: sql<number>`coalesce(sum(${schema.users.points}),0)::int` }).from(schema.users),
    db
      .select({
        active: sql<number>`count(*) filter (where ${schema.codes.status} = 'active')::int`,
        used: sql<number>`count(*) filter (where ${schema.codes.status} = 'used')::int`,
      })
      .from(schema.codes),
    db
      .select({ t: schema.topups, u: schema.users.displayName })
      .from(schema.topups)
      .innerJoin(schema.users, eq(schema.topups.userId, schema.users.id))
      .orderBy(desc(schema.topups.id))
      .limit(8),
    db
      .select({ o: schema.orders, u: schema.users.displayName })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .orderBy(desc(schema.orders.id))
      .limit(8),
    db.select({ items: schema.orders.items }).from(schema.orders).where(gte(schema.orders.createdAt, startOfBangkokDay(29))),
  ]);

  // ขายดี 30 วัน
  const best = new Map<string, { name: string; qty: number; robux: number }>();
  for (const r of recentOrderItems)
    for (const i of r.items) {
      const b = best.get(i.passKey) ?? { name: i.name, qty: 0, robux: 0 };
      b.qty += i.qty;
      b.robux += i.qty * i.priceRobux;
      best.set(i.passKey, b);
    }
  const bestList = [...best.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

  return (
    <div>
      <PageTitle title="ภาพรวมร้าน" sub="ตัวเลขทั้งหมดเป็นเวลาไทย" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="เติมเงินวันนี้" value={`฿${formatBaht(tToday.v)}`} hint={`${tToday.n} ซอง`} />
        <StatTile label="เติมเงิน 7 วัน" value={`฿${formatBaht(tWeek.v)}`} hint={`ทั้งหมด ฿${formatBaht(tAll.v)}`} />
        <StatTile label="ขายวันนี้" value={`฿${formatNumber(sToday.v)}`} hint={`${sToday.n} คำสั่งซื้อ`} />
        <StatTile label="ขาย 7 วัน" value={`฿${formatNumber(sWeek.v)}`} hint={`${sWeek.n} คำสั่งซื้อ`} />
        <StatTile label="สมาชิก" value={formatNumber(users.n)} />
        <StatTile label="แต้มค้างในระบบ" value={formatBaht(users.pts)} hint="แต้มที่ลูกค้ายังไม่ได้ใช้" />
        <StatTile label="โค้ดยังไม่ใช้" value={formatNumber(codeStats.active)} />
        <StatTile label="โค้ดใช้แล้ว" value={formatNumber(codeStats.used)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center justify-between font-bold">
            เติมเงินล่าสุด
            <Link href="/admin/topups" className="text-xs text-muted hover:text-fg">
              ทั้งหมด →
            </Link>
          </h2>
          <Table head={["เวลา", "ผู้ใช้", "ยอด", "สถานะ"]} empty={recentTopups.length === 0}>
            {recentTopups.map(({ t, u }) => (
              <tr key={t.id}>
                <td className="text-muted">{thaiDate.format(t.createdAt)}</td>
                <td>{u}</td>
                <td className="tabular-nums">{t.amount ? `฿${formatBaht(t.amount)}` : "-"}</td>
                <td>
                  <Status s={t.status} />
                </td>
              </tr>
            ))}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 flex items-center justify-between font-bold">
            คำสั่งซื้อล่าสุด
            <Link href="/admin/codes" className="text-xs text-muted hover:text-fg">
              ทั้งหมด →
            </Link>
          </h2>
          <Table head={["#", "ผู้ใช้", "ของ", "ยอด"]} empty={recentOrders.length === 0}>
            {recentOrders.map(({ o, u }) => (
              <tr key={o.id}>
                <td className="text-muted">#{o.id}</td>
                <td>{u}</td>
                <td className="max-w-[220px] truncate">{o.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</td>
                <td className="tabular-nums">฿{formatNumber(o.totalBaht)}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-bold">ขายดี 30 วัน</h2>
        <Table head={["พาส", "จำนวน", "Robux รวม"]} empty={bestList.length === 0}>
          {bestList.map((b) => (
            <tr key={b.name}>
              <td>{b.name}</td>
              <td className="tabular-nums">{formatNumber(b.qty)}</td>
              <td className="tabular-nums">{formatNumber(b.robux)} R$</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
