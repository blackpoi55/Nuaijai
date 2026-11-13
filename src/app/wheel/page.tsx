import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { LuckyWheel } from "@/components/lucky-wheel";
import { getCurrentUser } from "@/lib/auth";
import { formatNumber } from "@/lib/pricing";
import { iconUrl, listAllProducts, thumbsFor } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { available, listPrizes, toPublicPrizes, type PublicPrize } from "@/lib/wheel";
import { Coins, Sparkles, TicketPercent, Gift } from "lucide-react";

export const metadata = { title: "วงล้อนำโชค" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function WheelPage() {
  const [user, st, all] = await Promise.all([getCurrentUser(), getSettings(), listPrizes()]);
  const onWheel = available(all);
  // รูปไอเทมของรางวัลแบบไอเทม
  const prods = (await listAllProducts()).filter((p) => onWheel.some((w) => w.passKey === p.passKey));
  const thumbs = await thumbsFor(prods);
  const images = Object.fromEntries(prods.map((p) => [p.passKey, iconUrl(p.iconAssetId, thumbs) ?? ""]).filter(([, u]) => u));
  const prizes = toPublicPrizes(onWheel, images);
  const db = await getDb();
  const mine = user ? await db.select().from(schema.wheelSpins).where(eq(schema.wheelSpins.userId, user.id)).orderBy(desc(schema.wheelSpins.id)).limit(8) : [];
  const toNext = user ? st.bahtPerSpin - user.spinProgress : st.bahtPerSpin;

  if (!st.wheelOpen) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">วงล้อนำโชค</h1>
        <p className="mt-3 text-muted">ปิดชั่วคราว แล้วพบกันใหม่เร็วๆ นี้</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-12 text-center">
        <p className="eyebrow">Lucky Wheel</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">วงล้อนำโชค</h1>
        <p className="mt-3 text-muted">ช้อปครบ ฿{formatNumber(st.bahtPerSpin)} รับ 1 สิทธิ์หมุน</p>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_1fr]">
        <LuckyWheel prizes={prizes} credits={user?.spinCredits ?? 0} signedIn={!!user} />

        <div className="space-y-6">
          {user && (
            <section className="glass rounded-3xl p-6">
              <p className="text-sm text-muted">อีก ฿{formatNumber(toNext)} ได้สิทธิ์ถัดไป</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-[#c49a55] to-[#f6e3b4]" style={{ width: `${(user.spinProgress / st.bahtPerSpin) * 100}%` }} />
              </div>
              <Link href="/#passes" className="mt-4 inline-block text-sm text-gold hover:underline">
                ไปช้อป →
              </Link>
            </section>
          )}

          <section className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold">รางวัลและโอกาสออก</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2.5">
              {[...prizes]
                .sort((a, b) => a.chance - b.chance)
                .map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-black/20 p-2.5">
                    <PrizeThumb p={p} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${p.kind === "none" ? "text-dim" : "font-medium"}`}>{p.label}</span>
                      <span className="font-display text-base text-gold tabular-nums">{p.chance < 1 ? p.chance.toFixed(1) : Math.round(p.chance)}%</span>
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          {mine.length > 0 && (
            <section className="glass rounded-3xl p-6">
              <h2 className="text-lg font-semibold">ที่หมุนได้ล่าสุด</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {mine.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <span className={`flex items-center gap-2.5 ${s.kind === "none" ? "text-dim" : ""}`}>
                      <PrizeThumb p={prizes.find((p) => p.id === s.prizeId) ?? { id: 0, label: s.label, kind: s.kind, color: "", chance: 0, image: null, qty: 1 }} small />
                      {s.label}
                    </span>
                    <span className="text-xs text-dim">{s.reward ? <span className="mr-2 font-mono text-muted">{s.reward}</span> : null}{fmt.format(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// รูปเล็กของรางวัล: ไอเทมใช้รูปจริง อย่างอื่นใช้ไอคอนทองในเหรียญ
function PrizeThumb({ p, small }: { p: PublicPrize; small?: boolean }) {
  const size = small ? "size-8" : "size-12";
  if (p.image)
    return (
      <span className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" loading="lazy" className={`${size} rounded-full object-cover ring-2 ring-gold/50`} />
        {p.qty > 1 && (
          <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#fff6dc] to-[#c49a55] px-1.5 font-display font-bold leading-tight text-[#2a1d08] ring-1 ring-black/40 ${small ? "text-[9px]" : "text-[11px]"}`}>
            ×{p.qty}
          </span>
        )}
      </span>
    );
  const Icon = p.kind === "points" ? Coins : p.kind === "coupon" ? TicketPercent : p.kind === "item" ? Gift : Sparkles;
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full ring-2 ${p.kind === "none" ? "bg-white/5 ring-white/15" : "bg-gradient-to-br from-[#fff6dc] via-[#e2c27d] to-[#b88c47] ring-gold/50"}`}>
      <Icon className={`${small ? "size-4" : "size-6"} ${p.kind === "none" ? "text-dim" : "text-[#5a4220]"}`} strokeWidth={1.75} />
    </span>
  );
}
