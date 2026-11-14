import { desc, eq } from "drizzle-orm";
import { CheckCircle2, Clock, History, Receipt, Wallet, XCircle } from "lucide-react";
import { getDb, schema } from "@/db";
import { CouponBox } from "@/components/coupon-box";
import { TopupTabs } from "@/components/topup-tabs";
import { requireUser } from "@/lib/auth";
import { formatBaht } from "@/lib/pricing";
import { getSettings, promptPayId } from "@/lib/settings";
import { slipOkConfigured } from "@/lib/slipok";

export const metadata = { title: "เติมแต้ม" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function TopupPage() {
  const user = await requireUser("/topup");
  const st = await getSettings();
  const db = await getDb();
  const [history, mySlips] = await Promise.all([
    db.select().from(schema.pointLedger).where(eq(schema.pointLedger.userId, user.id)).orderBy(desc(schema.pointLedger.id)).limit(30),
    db
      .select({ id: schema.slips.id, amount: schema.slips.amount, status: schema.slips.status, note: schema.slips.note, createdAt: schema.slips.createdAt })
      .from(schema.slips)
      .where(eq(schema.slips.userId, user.id))
      .orderBy(desc(schema.slips.id))
      .limit(8),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="glass animate-rise relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="relative">
            <h1 className="text-4xl font-semibold">เติมแต้ม</h1>
            <p className="mt-1 text-sm text-dim">1 บาท = 1 แต้ม</p>

            <div className="my-6 flex items-center gap-4 rounded-2xl bg-black/30 p-4">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-300/15">
                <Wallet className="size-6 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted">แต้มคงเหลือ</p>
                <p className="text-3xl font-black tabular-nums text-gold">{formatBaht(user.points)}</p>
              </div>
            </div>

            <TopupTabs angpaoOpen={st.angpaoOpen} promptpayOpen={st.promptpayOpen} promptpayId={promptPayId()} contactUrl={st.contactUrl} autoCheck={st.slipAuto && slipOkConfigured()} />

          </div>
        </section>

        <div className="space-y-6">
          <CouponBox />
          {/* สลิปของฉัน */}
          <section className="glass animate-rise rounded-[2rem] p-6" style={{ animationDelay: "80ms" }}>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Receipt className="size-5 text-sky-300" /> สลิปพร้อมเพย์ของฉัน
            </h2>
            {mySlips.length === 0 ? (
              <p className="mt-4 text-sm text-muted">ยังไม่มีสลิป</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {mySlips.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.04] px-3.5 py-2.5">
                    <div>
                      <p className="font-semibold tabular-nums">฿{formatBaht(s.amount)}</p>
                      <p className="text-xs text-dim">{fmt.format(s.createdAt)}</p>
                      {s.status === "rejected" && s.note && <p className="mt-0.5 text-xs text-danger">{s.note}</p>}
                    </div>
                    <SlipStatus s={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ประวัติแต้ม */}
          <section className="glass animate-rise overflow-hidden rounded-[2rem]" style={{ animationDelay: "140ms" }}>
            <h2 className="flex items-center gap-2 px-6 pt-6 text-lg font-bold">
              <History className="size-5 text-muted" /> ประวัติแต้ม
            </h2>
            <div className="mt-3">
              {history.length === 0 && <p className="px-6 pb-6 text-sm text-muted">ยังไม่มีรายการ</p>}
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 border-t border-line px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.note ?? kindLabel(h.kind)}</p>
                    <p className="text-xs text-dim">{fmt.format(h.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold tabular-nums ${h.delta >= 0 ? "text-leaf" : "text-rose"}`}>
                      {h.delta >= 0 ? "+" : "−"}
                      {formatBaht(Math.abs(h.delta))}
                    </p>
                    <p className="text-xs text-dim">คงเหลือ {formatBaht(h.balanceAfter)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SlipStatus({ s }: { s: string }) {
  if (s === "approved")
    return (
      <span className="chip shrink-0 border-leaf/30 bg-leaf/10 text-leaf">
        <CheckCircle2 className="size-3.5" /> เข้าแล้ว
      </span>
    );
  if (s === "rejected")
    return (
      <span className="chip shrink-0 border-danger/30 bg-danger/10 text-danger">
        <XCircle className="size-3.5" /> ไม่ผ่าน
      </span>
    );
  return (
    <span className="chip shrink-0 border-gold/30 bg-gold/10 text-gold">
      <Clock className="size-3.5" /> รอตรวจ
    </span>
  );
}

function kindLabel(k: string) {
  return { topup: "เติมแต้ม", purchase: "ซื้อพาส", admin: "แอดมินปรับแต้ม", refund: "คืนแต้ม", coupon: "คูปอง" }[k] ?? k;
}
