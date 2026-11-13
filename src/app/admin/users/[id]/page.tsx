import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb, schema } from "@/db";
import { prettyCode } from "@/lib/codes";
import { formatBaht } from "@/lib/pricing";
import { PageTitle, StatTile, Status, Table, thaiDate } from "../../ui";
import { AdjustForm, FlagButtons, ResetForm } from "./forms";

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = Number(id);
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, uid || 0));
  if (!u) notFound();
  const [ledger, codes] = await Promise.all([
    db.select().from(schema.pointLedger).where(eq(schema.pointLedger.userId, u.id)).orderBy(desc(schema.pointLedger.id)).limit(50),
    db.select().from(schema.codes).where(eq(schema.codes.userId, u.id)).orderBy(desc(schema.codes.id)).limit(50),
  ]);

  return (
    <div>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> ผู้ใช้ทั้งหมด
      </Link>
      <PageTitle title={u.displayName} sub={`#${u.id} · สมัคร ${thaiDate.format(u.createdAt)}`} right={<FlagButtons id={u.id} banned={u.banned} admin={u.role === "admin"} />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="แต้มคงเหลือ" value={formatBaht(u.points)} />
        <StatTile label="โค้ดทั้งหมด" value={String(codes.length)} hint={`ยังไม่ใช้ ${codes.filter((c) => c.status === "active").length}`} />
        <StatTile label="สถานะ" value={u.banned ? "ระงับ" : u.role === "admin" ? "แอดมิน" : "ปกติ"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AdjustForm userId={u.id} />
        <ResetForm userId={u.id} />
      </div>

      <h2 className="mb-3 mt-8 font-bold">ประวัติแต้ม</h2>
      <Table head={["เวลา", "ประเภท", "รายการ", "เปลี่ยน", "คงเหลือ"]} empty={ledger.length === 0}>
        {ledger.map((l) => (
          <tr key={l.id}>
            <td className="text-xs text-muted">{thaiDate.format(l.createdAt)}</td>
            <td>{({ topup: "เติม", purchase: "ซื้อ", admin: "แอดมิน", refund: "คืนแต้ม" } as Record<string, string>)[l.kind] ?? l.kind}</td>
            <td>{l.note}</td>
            <td className={`tabular-nums ${l.delta >= 0 ? "text-leaf" : "text-rose"}`}>
              {l.delta >= 0 ? "+" : "−"}
              {formatBaht(Math.abs(l.delta))}
            </td>
            <td className="tabular-nums">{formatBaht(l.balanceAfter)}</td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 font-bold">โค้ด</h2>
      <Table head={["โค้ด", "ของ", "สถานะ", "ใช้โดย"]} empty={codes.length === 0}>
        {codes.map((c) => (
          <tr key={c.id}>
            <td className="font-mono">{prettyCode(c.code)}</td>
            <td>{c.label}</td>
            <td>
              <Status s={c.status} />
            </td>
            <td className="text-xs text-muted">{c.usedByRobloxId ?? "-"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
