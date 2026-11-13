import { desc, eq } from "drizzle-orm";
import { Clock, History, ShieldCheck, Wallet } from "lucide-react";
import { getDb, schema } from "@/db";
import { TopupForm } from "@/components/topup-form";
import { requireUser } from "@/lib/auth";
import { formatBaht } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "เติมแต้ม" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function TopupPage() {
  const user = await requireUser("/topup");
  const st = await getSettings();
  const db = await getDb();
  const history = await db
    .select()
    .from(schema.pointLedger)
    .where(eq(schema.pointLedger.userId, user.id))
    .orderBy(desc(schema.pointLedger.id))
    .limit(30);
  const failed = await db
    .select()
    .from(schema.topups)
    .where(eq(schema.topups.userId, user.id))
    .orderBy(desc(schema.topups.id))
    .limit(5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* เติม */}
        <section className="glass animate-rise relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative">
            <span className="chip border-orange-300/30 bg-orange-400/10 text-orange-300">ซองอั่งเปา TrueMoney</span>
            <h1 className="mt-4 text-3xl font-black">เติมแต้ม</h1>
            <p className="mt-1 text-muted">1 บาท = 1 แต้ม • ระบบรับซองและบวกแต้มอัตโนมัติ</p>

            <div className="my-6 flex items-center gap-4 rounded-2xl bg-black/30 p-4">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-300/15">
                <Wallet className="size-6 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted">แต้มคงเหลือ</p>
                <p className="text-3xl font-black tabular-nums text-gold">{formatBaht(user.points)}</p>
              </div>
            </div>

            {st.topupOpen ? <TopupForm /> : <p className="rounded-2xl bg-white/5 p-4 text-center text-muted">ปิดรับเติมแต้มชั่วคราว</p>}

            <p className="mt-4 flex items-center gap-1.5 text-xs text-dim">
              <ShieldCheck className="size-4" /> ซองหนึ่งเติมได้ครั้งเดียว • ถ้าแต้มไม่เข้า ติดต่อแอดมินพร้อมลิงก์ซอง
            </p>
          </div>
        </section>

        {/* วิธีทำซอง */}
        <section className="glass animate-rise rounded-[2rem] p-6 sm:p-8" style={{ animationDelay: "80ms" }}>
          <h2 className="text-lg font-bold">วิธีสร้างซองอั่งเปา</h2>
          <ol className="mt-4 space-y-4">
            {[
              ["เปิดแอป TrueMoney", "กดเมนู ‘ส่งซองของขวัญ’ หรือ ‘อั่งเปา’"],
              ["ใส่จำนวนเงิน", "เลือกแบ่งให้ 1 คน (ถ้าแบ่งหลายคน ร้านจะได้แค่ส่วนเดียว)"],
              ["สร้างซองแล้วคัดลอกลิงก์", "ลิงก์หน้าตาแบบ gift.truemoney.com/campaign/?v=..."],
              ["วางลิงก์ที่ช่องนี้", "กด ‘รับซอง เติมแต้มเลย’ แต้มเข้าทันที"],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-sm font-black text-white">{i + 1}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* ประวัติ */}
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <History className="size-5 text-muted" /> ประวัติแต้ม
        </h2>
        <div className="glass overflow-hidden rounded-3xl">
          {history.length === 0 && <p className="p-8 text-center text-muted">ยังไม่มีรายการ</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0">
              <div>
                <p className="font-medium">{h.note ?? kindLabel(h.kind)}</p>
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

        {failed.some((f) => f.status !== "success") && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
              <Clock className="size-4" /> ซองล่าสุด
            </h3>
            <div className="flex flex-wrap gap-2">
              {failed.map((f) => (
                <span key={f.id} className={`chip ${f.status === "success" ? "text-leaf" : f.status === "failed" ? "text-danger" : "text-gold"}`}>
                  …{f.voucherHash.slice(-6)} · {f.status === "success" ? `+${formatBaht(f.amount)}` : f.status === "failed" ? f.message ?? "ไม่สำเร็จ" : "กำลังตรวจ"}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function kindLabel(k: string) {
  return { topup: "เติมแต้ม", purchase: "ซื้อพาส", admin: "แอดมินปรับแต้ม", refund: "คืนแต้ม" }[k] ?? k;
}
