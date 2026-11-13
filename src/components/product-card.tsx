"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Crown, Info, X } from "lucide-react";
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
  const { rate, qty } = useCart();
  const [open, setOpen] = useState(false);
  const left = daysLeft(p.saleEnd);
  const inCart = qty[p.id] ?? 0;

  return (
    <>
      <article
        className="pass-card glass animate-rise flex flex-col rounded-3xl p-5 transition-transform duration-300"
        style={{ ["--c" as string]: p.color, animationDelay: `${index * 60}ms` }}
      >
        <div className="glow" />
        <div className="flex items-start justify-between gap-3">
          <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="size-24 rounded-2xl shadow-xl ring-1 ring-white/10" />
          <div className="flex flex-col items-end gap-1.5">
            {p.featured && (
              <span className="chip border-amber-300/30 bg-amber-300/15 text-gold">
                <Crown className="size-3.5" /> ขายดี
              </span>
            )}
            {left !== null && (
              <span className="chip border-rose/30 bg-rose/15 text-rose">
                <Clock className="size-3.5" /> เหลือ {left} วัน
              </span>
            )}
            {inCart > 0 && <span className="chip border-leaf/30 bg-leaf/15 text-leaf">ในตะกร้า {inCart}</span>}
          </div>
        </div>

        <h3 className="mt-4 text-xl font-bold">{p.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{p.blurb}</p>

        <ul className="mt-4 space-y-1.5 text-sm">
          {p.perks.slice(0, 3).map((k) => (
            <li key={k.t} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: p.color }} />
              <span className="line-clamp-1">{k.t}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1 self-start text-xs font-semibold text-muted hover:text-fg">
          <Info className="size-3.5" /> ดูสิทธิ์ทั้งหมด {p.perks.length > 3 ? `(+${p.perks.length - 3})` : ""}
        </button>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs text-dim line-through decoration-white/30">{formatNumber(p.priceRobux)} R$</p>
            <p className="text-2xl font-extrabold">
              ฿{formatNumber(itemBaht(p.priceRobux, rate))}
            </p>
          </div>
          <AddToCartButton id={p.id} />
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
        <div className="scrollbar-thin max-h-[88dvh] overflow-y-auto p-6">
          <div className="flex items-center gap-4">
            <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="size-20 rounded-2xl ring-1 ring-white/10" />
            <div>
              <h3 className="text-2xl font-extrabold">{p.name}</h3>
              <p className="text-sm text-muted">{p.blurb}</p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {p.perks.map((k) => (
              <li key={k.t} className="rounded-2xl bg-white/[0.04] p-3.5">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0" style={{ color: p.color }} /> {k.t}
                </p>
                <p className="mt-1 pl-6 text-sm text-muted">{k.d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-dim">{formatNumber(p.priceRobux)} R$</p>
              <p className="text-2xl font-extrabold">฿{formatNumber(itemBaht(p.priceRobux, rate))}</p>
            </div>
            <AddToCartButton id={p.id} className="!px-6 !py-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
