"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Plus, X } from "lucide-react";
import type { PublicProduct } from "@/lib/products";
import { formatNumber, itemBaht } from "@/lib/pricing";
import { AddToCartButton, useCart } from "./cart";
import { Countdown, thaiWhen } from "./countdown";
import { PassIcon } from "./ui";

export function daysLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400_000);
}

/** ป้ายนับถอยหลังบนการ์ด: ของเร็วๆ นี้ = นับถึงวันเปิดขาย • ของลิมิเต็ด = นับถึงวันปิดขาย */
function SaleBadge({ p, upcoming }: { p: PublicProduct; upcoming?: boolean }) {
  const to = upcoming ? p.saleStart : p.saleEnd;
  if (!to) return null;
  const days = daysLeft(to);
  return (
    <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-xl bg-black/65 px-2.5 py-1.5 text-champagne backdrop-blur sm:left-2.5 sm:top-2.5">
      <Clock className="size-3.5 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-champagne/75">{upcoming ? "เปิดขายใน" : "ปิดขายใน"}</span>
        <span className="whitespace-nowrap text-[11px] font-semibold">
          <Countdown to={to} fallback={`${days} วัน`} />
        </span>
      </span>
    </span>
  );
}

export function ProductCard({ p, index = 0, upcoming = false }: { p: PublicProduct; index?: number; upcoming?: boolean }) {
  const { rate, qty, add } = useCart();
  const [open, setOpen] = useState(false);
  const inCart = qty[p.id] ?? 0;

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="pass-card glass animate-rise group flex cursor-pointer flex-col rounded-[1.75rem] p-2.5 transition-transform duration-500 sm:p-3"
        style={{ ["--c" as string]: p.color, animationDelay: `${index * 50}ms` }}
      >
        <div className="glow" />
        <div className="relative overflow-hidden rounded-[1.35rem]">
          <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="aspect-square w-full transition-transform duration-700 group-hover:scale-[1.04]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
          <SaleBadge p={p} upcoming={upcoming} />
          {inCart > 0 && (
            <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-gold text-[11px] font-bold text-ink">{inCart}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3.5">
          <h3 className="line-clamp-1 text-base font-medium sm:text-lg">{p.name}</h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="leading-tight">
              <p className="text-[11px] text-dim">{formatNumber(p.priceRobux)} R$</p>
              <p className="font-display text-xl font-semibold text-gold sm:text-2xl">฿{formatNumber(itemBaht(p.priceRobux, rate))}</p>
            </div>
            {upcoming ? (
              <span className="chip shrink-0 !px-2.5 !py-1.5 text-[11px] text-champagne">เร็วๆ นี้</span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  add(p.id);
                }}
                aria-label={`ใส่ ${p.name} ลงตะกร้า`}
                className="btn btn-primary !size-10 shrink-0 !p-0"
              >
                <Plus className="size-5" />
              </button>
            )}
          </div>
        </div>
      </article>
      {open && <PerksModal p={p} upcoming={upcoming} onClose={() => setOpen(false)} />}
    </>
  );
}

export function PerksModal({ p, onClose, upcoming = false }: { p: PublicProduct; onClose: () => void; upcoming?: boolean }) {
  const { rate } = useCart();
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end p-0 sm:place-items-center sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="pass-card animate-rise relative max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-ink-2 sm:rounded-3xl"
        style={{ ["--c" as string]: p.color, animationDuration: ".3s" }}
      >
        <div className="glow" />
        <button onClick={onClose} className="btn btn-ghost absolute right-4 top-4 z-10 !p-2" aria-label="ปิด">
          <X className="size-5" />
        </button>
        <div className="scrollbar-thin max-h-[88dvh] overflow-y-auto">
          <div className="relative">
            <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="aspect-[16/10] w-full [&>img]:object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink-2/30 to-transparent" />
            <div className="absolute inset-x-6 bottom-4">
              <h3 className="text-3xl font-semibold">{p.name}</h3>
              {p.blurb && <p className="mt-1 text-sm text-muted">{p.blurb}</p>}
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="gold-rule my-4" />
            {(upcoming ? p.saleStart : p.saleEnd) && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
                <Clock className="size-5 shrink-0 text-gold" strokeWidth={1.75} />
                <div className="leading-snug">
                  <p className="text-xs text-muted">
                    {upcoming ? `เปิดขาย ${thaiWhen.format(new Date(p.saleStart!))} น.` : `ปิดขาย ${thaiWhen.format(new Date(p.saleEnd!))} น.`}
                  </p>
                  <p className="font-display text-lg font-semibold text-champagne">
                    {upcoming ? "อีก " : "เหลือเวลา "}
                    <Countdown to={(upcoming ? p.saleStart : p.saleEnd)!} />
                  </p>
                </div>
              </div>
            )}
            <ul className="space-y-3.5">
              {p.perks.map((k) => (
                <li key={k.t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.75} />
                  <div>
                    <p className="font-medium">{k.t}</p>
                    {k.d && <p className="mt-0.5 text-sm text-dim">{k.d}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center justify-between gap-3">
              <div className="leading-tight">
                <p className="text-xs text-dim">{formatNumber(p.priceRobux)} R$</p>
                <p className="font-display text-3xl font-semibold text-gold">฿{formatNumber(itemBaht(p.priceRobux, rate))}</p>
              </div>
              {upcoming ? (
                <span className="btn btn-ghost pointer-events-none !px-6 !py-3 opacity-80">ยังไม่เปิดขาย</span>
              ) : (
                <AddToCartButton id={p.id} className="!px-7 !py-3" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
