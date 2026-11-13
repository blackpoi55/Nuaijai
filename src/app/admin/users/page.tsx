import Link from "next/link";
import { desc, ilike } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatBaht } from "@/lib/pricing";
import { PageTitle, SearchBox, Table, thaiDate } from "../ui";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(q ? ilike(schema.users.username, `%${q.toLowerCase().replace(/[%_]/g, "")}%`) : undefined)
    .orderBy(desc(schema.users.id))
    .limit(100);
  return (
    <div>
      <PageTitle title="ผู้ใช้" right={<SearchBox placeholder="ค้นหาชื่อผู้ใช้" defaultValue={q} />} />
      <Table head={["#", "ชื่อผู้ใช้", "แต้ม", "สมัครเมื่อ", "เข้าล่าสุด", ""]} empty={rows.length === 0}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className="text-muted">{u.id}</td>
            <td className="font-semibold">
              {u.displayName}
              {u.role === "admin" && <span className="chip ml-2 text-grape">แอดมิน</span>}
              {u.banned && <span className="chip ml-2 text-danger">ระงับ</span>}
            </td>
            <td className="tabular-nums text-gold">{formatBaht(u.points)}</td>
            <td className="text-xs text-muted">{thaiDate.format(u.createdAt)}</td>
            <td className="text-xs text-muted">{u.lastLoginAt ? thaiDate.format(u.lastLoginAt) : "-"}</td>
            <td>
              <Link href={`/admin/users/${u.id}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                เติม/คืนแต้ม · จัดการ
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
