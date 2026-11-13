"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import type { PublicProduct } from "@/lib/products";
import { formatNumber, itemBaht } from "@/lib/pricing";
import { AddToCartButton, useCart } from "./cart";
import { PassIcon } from "./ui";

export function daysLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400_000);
}

export function ProductCard({ p, index = 0 }: { p: PublicProduct; index?: number }) {
  const { rate, qty, add } = useCart();
  const [open, setOpen] = useState(false);
  const left = daysLeft(p.saleEnd);
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
          {left !== null && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-champagne backdrop-blur">เหลือ {left} วัน</span>
          )}
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
          </div>
        </div>
      </article>
      {open && <PerksModal p={p} onClose={() => setOpen(false)} />}
    </>
  );
}

export function PerksModal({ p, onClose }: { p: PublicProduct; onClose: () => void }) {
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
              <AddToCartButton id={p.id} className="!px-7 !py-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
