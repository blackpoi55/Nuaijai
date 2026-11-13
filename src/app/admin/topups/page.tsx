import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatBaht } from "@/lib/pricing";
import { PageTitle, Status, Table, thaiDate } from "../ui";
import { ResolveForm } from "./resolve";

export default async function AdminTopups({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const status = s === "success" || s === "failed" || s === "pending" ? s : undefined;
  const db = await getDb();
  const rows = await db
    .select({ t: schema.topups, u: schema.users.displayName })
    .from(schema.topups)
    .innerJoin(schema.users, eq(schema.topups.userId, schema.users.id))
    .where(and(eq(schema.topups.isTest, false), status ? eq(schema.topups.status, status) : undefined))
    .orderBy(desc(schema.topups.id))
    .limit(200);
  const tabs = [
    [undefined, "ทั้งหมด"],
    ["success", "สำเร็จ"],
    ["failed", "ล้มเหลว"],
    ["pending", "ค้าง"],
  ] as const;
  return (
    <div>
      <PageTitle
        title="เติมเงิน (ซองอั่งเปา)"
        sub="ซองที่ล้มเหลวแต่เงินเข้าจริง ตรวจในแอป TrueMoney แล้วกด ‘เติมให้’ ได้"
        right={
          <div className="flex gap-1 rounded-xl bg-black/30 p-1 text-sm">
            {tabs.map(([v, l]) => (
              <Link key={l} href={v ? `?s=${v}` : "?"} className={`rounded-lg px-3 py-1.5 font-semibold ${status === v ? "bg-white/10" : "text-muted"}`}>
                {l}
              </Link>
            ))}
          </div>
        }
      />
      <Table head={["เวลา", "ผู้ใช้", "รหัสซอง", "ยอด", "ผู้ส่ง", "สถานะ", "ข้อความ", ""]} empty={rows.length === 0}>
        {rows.map(({ t, u }) => (
          <tr key={t.id}>
            <td className="text-xs text-muted">{thaiDate.format(t.createdAt)}</td>
            <td>
              <Link href={`/admin/users/${t.userId}`} className="hover:underline">
                {u}
              </Link>
            </td>
            <td className="font-mono text-xs">
              <a href={`https://gift.truemoney.com/campaign/?v=${t.voucherHash}`} target="_blank" rel="noreferrer" className="hover:underline">
                …{t.voucherHash.slice(-10)}
              </a>
            </td>
            <td className="tabular-nums">{t.amount ? `฿${formatBaht(t.amount)}` : "-"}</td>
            <td className="text-xs">{t.senderName ?? "-"}</td>
            <td>
              <Status s={t.status} />
            </td>
            <td className="max-w-[220px] text-xs text-muted">
              {t.providerCode && <span className="font-mono">{t.providerCode} </span>}
              {t.message}
            </td>
            <td>{t.status !== "success" && <ResolveForm id={t.id} />}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
