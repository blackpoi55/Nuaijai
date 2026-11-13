import Link from "next/link";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatBaht } from "@/lib/pricing";
import { promptPayId } from "@/lib/settings";
import { maskPhone } from "@/lib/promptpay";
import { PageTitle, thaiDate } from "../ui";
import { SlipActions } from "./actions";

export default async function AdminSlips({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const status = s === "approved" || s === "rejected" ? s : "pending";
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.slips.id,
      userId: schema.slips.userId,
      amount: schema.slips.amount,
      imageHash: schema.slips.imageHash,
      status: schema.slips.status,
      note: schema.slips.note,
      createdAt: schema.slips.createdAt,
      reviewedAt: schema.slips.reviewedAt,
      user: schema.users.displayName,
    })
    .from(schema.slips)
    .innerJoin(schema.users, eq(schema.slips.userId, schema.users.id))
    .where(eq(schema.slips.status, status))
    .orderBy(status === "pending" ? schema.slips.id : desc(schema.slips.id))
    .limit(60);

  // สลิปรูปเดียวกันที่เคยส่งมาแล้ว (กันส่งสลิปเดิมซ้ำ)
  const hashes = [...new Set(rows.map((r) => r.imageHash))];
  const dupRows = hashes.length
    ? await db
        .select({ h: schema.slips.imageHash, n: sql<number>`count(*)::int` })
        .from(schema.slips)
        .where(and(inArray(schema.slips.imageHash, hashes), ne(schema.slips.status, "rejected")))
        .groupBy(schema.slips.imageHash)
    : [];
  const dup = new Map(dupRows.map((d) => [d.h, d.n]));

  const tabs = [
    ["pending", "รอตรวจ"],
    ["approved", "อนุมัติแล้ว"],
    ["rejected", "ปฏิเสธแล้ว"],
  ] as const;

  return (
    <div>
      <PageTitle
        title="สลิปพร้อมเพย์"
        sub={`เช็คในแอปธนาคารของบัญชีพร้อมเพย์ ${maskPhone(promptPayId())} ว่าเงินเข้าจริงก่อนกดอนุมัติ`}
        right={
          <div className="flex gap-1 rounded-xl bg-black/30 p-1 text-sm">
            {tabs.map(([v, l]) => (
              <Link key={v} href={`?s=${v}`} className={`rounded-lg px-3 py-1.5 font-semibold ${status === v ? "bg-white/10" : "text-muted"}`}>
                {l}
              </Link>
            ))}
          </div>
        }
      />
      {rows.length === 0 && <p className="glass rounded-2xl p-10 text-center text-muted">ไม่มีสลิป{status === "pending" ? "รอตรวจ" : ""}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <article key={r.id} className="glass flex gap-4 rounded-2xl p-4">
            <a href={`/api/slip/${r.id}`} target="_blank" rel="noreferrer" className="shrink-0" title="เปิดรูปเต็ม">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/slip/${r.id}`} alt={`สลิป #${r.id}`} loading="lazy" className="h-44 w-28 rounded-xl bg-white object-cover ring-1 ring-white/10 transition hover:ring-sky-400" />
            </a>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-2xl font-black tabular-nums">฿{formatBaht(r.amount)}</p>
              <p className="text-sm">
                <Link href={`/admin/users/${r.userId}`} className="font-semibold hover:underline">
                  {r.user}
                </Link>
              </p>
              <p className="text-xs text-dim">ส่ง {thaiDate.format(r.createdAt)}</p>
              {r.reviewedAt && <p className="text-xs text-dim">ตรวจ {thaiDate.format(r.reviewedAt)}</p>}
              {(dup.get(r.imageHash) ?? 0) > 1 && <p className="chip border-danger/30 bg-danger/10 text-danger">⚠ รูปซ้ำกับสลิปอื่น</p>}
              {r.note && <p className="text-xs text-danger">{r.note}</p>}
              {r.status === "pending" && <SlipActions id={r.id} amount={r.amount / 100} />}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
