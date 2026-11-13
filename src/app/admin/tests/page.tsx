import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { FlaskConical } from "lucide-react";
import { getDb, schema } from "@/db";
import { prettyCode } from "@/lib/codes";
import { formatBaht, formatNumber } from "@/lib/pricing";
import { PageTitle, StatTile, Status, Table, thaiDate } from "../ui";

// รายการที่แอดมินทำเอง (ซื้อ เติม ส่งสลิป) — ไม่นับในรายได้หรือสถิติหน้าภาพรวม
export default async function AdminTests() {
  const db = await getDb();
  const [orders, codes, topups, slips, [tot]] = await Promise.all([
    db
      .select({ o: schema.orders, u: schema.users.displayName })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .where(eq(schema.orders.isTest, true))
      .orderBy(desc(schema.orders.id))
      .limit(100),
    db.select().from(schema.codes).where(eq(schema.codes.isTest, true)).orderBy(desc(schema.codes.id)).limit(300),
    db
      .select({ t: schema.topups, u: schema.users.displayName })
      .from(schema.topups)
      .innerJoin(schema.users, eq(schema.topups.userId, schema.users.id))
      .where(eq(schema.topups.isTest, true))
      .orderBy(desc(schema.topups.id))
      .limit(100),
    db
      .select({
        id: schema.slips.id,
        amount: schema.slips.amount,
        status: schema.slips.status,
        createdAt: schema.slips.createdAt,
        u: schema.users.displayName,
      })
      .from(schema.slips)
      .innerJoin(schema.users, eq(schema.slips.userId, schema.users.id))
      .where(eq(schema.slips.isTest, true))
      .orderBy(desc(schema.slips.id))
      .limit(100),
    db.execute<{ orders: number; baht: number; topup: number }>(sql`
      select
        (select count(*)::int from ${schema.orders} where ${schema.orders.isTest}) as orders,
        (select coalesce(sum(${schema.orders.totalBaht}), 0)::int from ${schema.orders} where ${schema.orders.isTest}) as baht,
        (select coalesce(sum(${schema.topups.amount}), 0)::int from ${schema.topups} where ${schema.topups.isTest} and ${schema.topups.status} = 'success')
          + (select coalesce(sum(${schema.slips.amount}), 0)::int from ${schema.slips} where ${schema.slips.isTest} and ${schema.slips.status} = 'approved') as topup
    `).then((r) => r.rows as { orders: number; baht: number; topup: number }[]),
  ]);

  return (
    <div>
      <PageTitle
        title="รายการเทสของแอดมิน"
        sub="ทุกอย่างที่บัญชีแอดมินซื้อ เติม หรือส่งสลิป — ไม่นับเป็นรายได้ ไม่ขึ้นในหน้าภาพรวมและหน้ารายการปกติ"
      />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="คำสั่งซื้อเทส" value={formatNumber(tot.orders)} />
        <StatTile label="มูลค่าที่ซื้อเทส" value={`฿${formatNumber(tot.baht)}`} hint="ไม่นับรายได้" />
        <StatTile label="เติมเทส (ซอง + สลิป)" value={`฿${formatBaht(tot.topup)}`} hint="ไม่นับรายได้" />
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <FlaskConical className="size-4 text-grape" /> คำสั่งซื้อและโค้ด
      </h2>
      <Table head={["เวลา", "คำสั่งซื้อ", "แอดมิน", "โค้ด", "สถานะ", "ใช้โดย"]} empty={orders.length === 0}>
        {orders.flatMap(({ o, u }) =>
          codes
            .filter((c) => c.orderId === o.id)
            .map((c, i) => (
              <tr key={c.id}>
                <td className="text-xs text-muted">{i === 0 ? thaiDate.format(o.createdAt) : ""}</td>
                <td>
                  {i === 0 && (
                    <Link href={`/orders/${o.id}`} className="text-muted hover:underline">
                      #{o.id} · ฿{formatNumber(o.totalBaht)}
                    </Link>
                  )}
                </td>
                <td>{i === 0 ? u : ""}</td>
                <td>
                  <span className="font-mono text-xs">{prettyCode(c.code)}</span>
                  <div className="max-w-[220px] truncate text-xs text-muted">{c.label}</div>
                </td>
                <td>
                  <Status s={c.status} />
                </td>
                <td className="text-xs text-muted">
                  {c.usedByRobloxId ? (
                    <>
                      <span className="font-semibold text-fg">{c.usedByName ? `@${c.usedByName}` : "ไม่ทราบชื่อ"}</span> · ID {c.usedByRobloxId}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            )),
        )}
      </Table>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold">ซองอั่งเปาเทส</h2>
          <Table head={["เวลา", "แอดมิน", "ยอด", "สถานะ"]} empty={topups.length === 0}>
            {topups.map(({ t, u }) => (
              <tr key={t.id}>
                <td className="text-xs text-muted">{thaiDate.format(t.createdAt)}</td>
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
          <h2 className="mb-3 font-bold">สลิปพร้อมเพย์เทส</h2>
          <Table head={["เวลา", "แอดมิน", "ยอด", "สถานะ"]} empty={slips.length === 0}>
            {slips.map((s) => (
              <tr key={s.id}>
                <td className="text-xs text-muted">{thaiDate.format(s.createdAt)}</td>
                <td>{s.u}</td>
                <td className="tabular-nums">฿{formatBaht(s.amount)}</td>
                <td>
                  <Status s={s.status === "approved" ? "success" : s.status === "rejected" ? "failed" : "pending"} />
                </td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </div>
  );
}
