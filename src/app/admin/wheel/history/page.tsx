import Link from "next/link";
import { and, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageTitle, SearchBox, StatTile, Status, Table, likeEscape, thaiDate } from "../../ui";

export const metadata = { title: "ประวัติวงล้อ" };

const PER_PAGE = 50;
const KINDS = [
  { key: "", label: "ทั้งหมด" },
  { key: "item", label: "ไอเทม" },
  { key: "coupon", label: "คูปอง" },
  { key: "points", label: "แต้ม" },
  { key: "none", label: "เกือบได้" },
] as const;

type Search = { q?: string; kind?: string; page?: string };

// ใครหมุนได้อะไร — ค้นหาตามชื่อผู้ใช้ กรองตามประเภทรางวัล และดูว่าของที่ได้ถูกใช้หรือยัง
export default async function WheelHistory({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 40);
  const kind = KINDS.some((k) => k.key === sp.kind) ? (sp.kind as string) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const conds: SQL[] = [];
  if (q) conds.push(ilike(schema.users.username, `%${likeEscape(q)}%`));
  if (kind) conds.push(eq(schema.wheelSpins.kind, kind));
  const where = conds.length ? and(...conds) : undefined;

  const db = await getDb();
  const [rows, [{ total }], summary] = await Promise.all([
    db
      .select({ s: schema.wheelSpins, u: { id: schema.users.id, username: schema.users.username, name: schema.users.displayName, role: schema.users.role } })
      .from(schema.wheelSpins)
      .innerJoin(schema.users, eq(schema.wheelSpins.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.wheelSpins.id))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.wheelSpins)
      .innerJoin(schema.users, eq(schema.wheelSpins.userId, schema.users.id))
      .where(where),
    db
      .select({ label: schema.wheelSpins.label, kind: schema.wheelSpins.kind, n: sql<number>`count(*)::int` })
      .from(schema.wheelSpins)
      .innerJoin(schema.users, eq(schema.wheelSpins.userId, schema.users.id))
      .where(where)
      .groupBy(schema.wheelSpins.label, schema.wheelSpins.kind)
      .orderBy(desc(sql`count(*)`)),
  ]);

  // สถานะของที่ได้: คูปองใช้แล้วหรือยัง / โค้ดเกมถูกใช้โดยใคร
  const couponCodes = rows.filter((r) => r.s.kind === "coupon" && r.s.reward).map((r) => r.s.reward!);
  const gameCodes = rows.filter((r) => r.s.kind === "item" && r.s.reward).map((r) => r.s.reward!.replace(/-/g, ""));
  const [coupons, codes] = await Promise.all([
    couponCodes.length
      ? db.select({ code: schema.coupons.code, used: schema.coupons.usedCount, max: schema.coupons.maxUses }).from(schema.coupons).where(inArray(schema.coupons.code, couponCodes))
      : [],
    gameCodes.length
      ? db
          .select({ code: schema.codes.code, status: schema.codes.status, by: schema.codes.usedByName, byId: schema.codes.usedByRobloxId })
          .from(schema.codes)
          .where(inArray(schema.codes.code, gameCodes))
      : [],
  ]);
  const couponMap = new Map(coupons.map((c) => [c.code, c]));
  const codeMap = new Map(codes.map((c) => [c.code, c]));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: Partial<Search>) => {
    const u = new URLSearchParams();
    const next = { q, kind, page: "1", ...p };
    if (next.q) u.set("q", next.q);
    if (next.kind) u.set("kind", next.kind);
    if (next.page && next.page !== "1") u.set("page", next.page);
    const s = u.toString();
    return `/admin/wheel/history${s ? `?${s}` : ""}`;
  };
  const won = summary.filter((s) => s.kind !== "none").reduce((a, s) => a + s.n, 0);

  return (
    <div>
      <PageTitle
        title="ประวัติวงล้อ"
        sub="ใครหมุนได้อะไร และใช้ของที่ได้ไปแล้วหรือยัง"
        right={
          <div className="flex w-full max-w-sm items-center gap-2">
            <Link href="/admin/wheel" className="btn btn-ghost shrink-0 !px-3 !py-2 text-sm">
              ← วงล้อ
            </Link>
            <SearchBox placeholder="ค้นหาชื่อผู้ใช้" defaultValue={q} />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Link key={k.key} href={href({ kind: k.key })} className={`chip !px-3 !py-1.5 text-sm ${kind === k.key ? "border-gold/50 bg-gold/15 text-gold" : "text-muted hover:text-fg"}`}>
            {k.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label={q ? `หมุนของ "${q}"` : "หมุนทั้งหมด"} value={total.toLocaleString("th-TH")} />
        <StatTile label="ได้รางวัล" value={won.toLocaleString("th-TH")} hint={total ? `${Math.round((won / total) * 100)}% ของการหมุน` : undefined} />
        <StatTile label="เกือบได้" value={(total - won).toLocaleString("th-TH")} />
      </div>

      {summary.length > 0 && (
        <div className="glass mt-4 rounded-2xl p-4">
          <p className="mb-3 text-xs font-semibold text-muted">รางวัลที่ออก</p>
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <span key={s.label} className={`chip !px-3 !py-1.5 text-sm ${s.kind === "none" ? "text-dim" : ""}`}>
                {s.label} <b className="ml-1.5 tabular-nums text-gold">×{s.n}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Table head={["เวลา", "ผู้ใช้", "รางวัล", "ของที่ได้", "สถานะ"]} empty={rows.length === 0}>
          {rows.map(({ s, u }) => {
            const cp = s.kind === "coupon" && s.reward ? couponMap.get(s.reward) : undefined;
            const cd = s.kind === "item" && s.reward ? codeMap.get(s.reward.replace(/-/g, "")) : undefined;
            return (
              <tr key={s.id}>
                <td className="text-xs text-muted">{thaiDate.format(s.createdAt)}</td>
                <td>
                  <Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline">
                    {u.name}
                  </Link>
                  <span className="ml-1.5 text-xs text-dim">@{u.username}</span>
                  {u.role === "admin" && <span className="chip ml-2 text-grape">แอดมิน</span>}
                </td>
                <td className={s.kind === "none" ? "text-dim" : "font-medium"}>{s.label}</td>
                <td className="font-mono text-xs">{s.reward ?? "-"}</td>
                <td>
                  {s.kind === "points" && <span className="chip border-leaf/30 bg-leaf/10 text-leaf">เข้าแต้มแล้ว</span>}
                  {s.kind === "none" && <span className="text-dim">-</span>}
                  {cp && <Status s={cp.used >= cp.max ? "used" : "active"} />}
                  {cd && (
                    <span className="flex items-center gap-2">
                      <Status s={cd.status} />
                      {cd.status === "used" && cd.by && (
                        <span className="text-xs text-muted">
                          @{cd.by}
                          {cd.byId ? ` · ${cd.byId}` : ""}
                        </span>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={href({ page: String(page - 1) })} className="btn btn-ghost !px-3 !py-1.5">
              ← ก่อนหน้า
            </Link>
          )}
          <span className="text-muted">
            หน้า {page} / {pages}
          </span>
          {page < pages && (
            <Link href={href({ page: String(page + 1) })} className="btn btn-ghost !px-3 !py-1.5">
              ถัดไป →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
