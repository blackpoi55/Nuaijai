import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { prettyCode } from "@/lib/codes";
import { PageTitle, SearchBox, Status, Table, thaiDate } from "../ui";
import { RevokeButton } from "./revoke";

export default async function AdminCodes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const db = await getDb();
  const clean = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const num = Number(q.replace(/\D/g, ""));
  const where = q
    ? or(
        clean.length >= 4 ? sql`${schema.codes.code} like ${`%${clean}%`}` : undefined,
        num ? eq(schema.codes.usedByRobloxId, num) : undefined,
        num ? eq(schema.codes.orderId, num) : undefined,
        q.trim().length >= 3 ? ilike(schema.codes.usedByName, `%${q.trim().replace(/^@/, "").replace(/[%_]/g, "")}%`) : undefined,
      )
    : undefined;
  const rows = await db
    .select({ c: schema.codes, u: schema.users.displayName })
    .from(schema.codes)
    .innerJoin(schema.users, eq(schema.codes.userId, schema.users.id))
    .where(and(eq(schema.codes.isTest, false), where))
    .orderBy(desc(schema.codes.id))
    .limit(200);
  return (
    <div>
      <PageTitle title="คำสั่งซื้อ / โค้ด" sub="ค้นหาด้วยโค้ด, เลขคำสั่งซื้อ, Roblox ID หรือ username ที่ใช้โค้ด" right={<SearchBox placeholder="ค้นหา..." defaultValue={q} />} />
      <Table head={["เวลา", "คำสั่งซื้อ", "ผู้ซื้อ", "โค้ด", "ของ", "สถานะ", "ใช้โดย", ""]} empty={rows.length === 0}>
        {rows.map(({ c, u }) => (
          <tr key={c.id}>
            <td className="text-xs text-muted">{thaiDate.format(c.createdAt)}</td>
            <td>
              <Link href={`/orders/${c.orderId}`} className="text-muted hover:underline">
                #{c.orderId}
              </Link>
            </td>
            <td>
              <Link href={`/admin/users/${c.userId}`} className="hover:underline">
                {u}
              </Link>
            </td>
            <td className="font-mono text-xs">{prettyCode(c.code)}</td>
            <td className="max-w-[200px] truncate">{c.label}</td>
            <td>
              <Status s={c.status} />
            </td>
            <td className="text-xs text-muted">
              {c.usedByRobloxId ? (
                <a href={`https://www.roblox.com/users/${c.usedByRobloxId}/profile`} target="_blank" rel="noreferrer" className="hover:underline">
                  <span className="font-semibold text-fg">{c.usedByName ? `@${c.usedByName}` : "ไม่ทราบชื่อ"}</span>
                  {c.usedByDisplayName && c.usedByDisplayName !== c.usedByName && <span> ({c.usedByDisplayName})</span>}
                  <div>ID {c.usedByRobloxId}</div>
                </a>
              ) : (
                "-"
              )}
              {c.usedAt && <div>{thaiDate.format(c.usedAt)}</div>}
            </td>
            <td>{c.status === "active" && <RevokeButton id={c.id} />}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
