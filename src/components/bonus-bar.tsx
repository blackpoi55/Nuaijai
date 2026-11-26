"use client";

import { Gift, PartyPopper } from "lucide-react";
import { formatNumber } from "@/lib/pricing";
import { type BonusTier, bonusName, bonusProgress } from "@/lib/bonus-shared";
import { PassIcon } from "./ui";

/** แถบของแถมในตะกร้า: "ซื้ออีก ฿X รับฟรี ..." หรือ "ได้ของแถม ..." */
export function BonusBar({ tiers, paidBaht }: { tiers: BonusTier[]; paidBaht: number }) {
  if (!tiers.length) return null;
  const { got, next, need } = bonusProgress(tiers, paidBaht);
  const show = got ?? next!;
  const from = got && next ? got.minBaht : 0;
  const pct = next ? Math.min(100, Math.max(4, ((paidBaht - from) / Math.max(1, next.minBaht - from)) * 100)) : 100;
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.07] p-3">
      <div className="flex items-center gap-3">
        <PassIcon src={show.iconUrl} name={show.name} color={show.color} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          {got && (
            <p className="flex items-center gap-1.5 font-semibold text-leaf">
              <PartyPopper className="size-4 shrink-0" /> ได้ของแถม {bonusName(got)}
            </p>
          )}
          {next && (
            <p className={got ? "text-xs text-muted" : "font-semibold text-champagne"}>
              {!got && <Gift className="mr-1 inline size-4 -translate-y-px text-gold" />}
              ซื้ออีก <b className="text-gold">฿{formatNumber(need)}</b> {got ? "อัปเป็น" : "รับฟรี"} {bonusName(next)}
            </p>
          )}
        </div>
      </div>
      {next && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-gold transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** ป้ายหน้าแรก: บอกขั้นของแถมทั้งหมด (ซ่อนถ้าไม่มี) */
export function BonusStrip({ tiers }: { tiers: BonusTier[] }) {
  if (!tiers.length) return null;
  return (
    <section className="mb-16 flex flex-col gap-4 rounded-3xl border border-gold/30 bg-gradient-to-r from-gold/[0.10] via-gold/[0.04] to-transparent p-5 sm:flex-row sm:items-center sm:p-6">
      <p className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold text-champagne">
        <Gift className="size-6 text-gold" /> ซื้อครบ รับของแถมฟรี
      </p>
      <div className="flex flex-wrap gap-2.5">
        {tiers.map((t) => (
          <span key={`${t.minBaht}-${t.name}`} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 py-1.5 pl-1.5 pr-3.5 text-sm">
            <PassIcon src={t.iconUrl} name={t.name} color={t.color} className="size-9 rounded-xl" />
            <span className="leading-tight">
              <span className="block text-xs text-muted">ครบ ฿{formatNumber(t.minBaht)}</span>
              <span className="font-semibold">{bonusName(t)}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
