"use client";

import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import type { PublicProduct } from "@/lib/products";
import { formatNumber, itemBaht } from "@/lib/pricing";
import { AddToCartButton, useCart } from "./cart";
import { PerksModal } from "./product-card";
import { PassIcon } from "./ui";

// การ์ดพาสเด่นในส่วนหัว เอียงตามเมาส์
export function HeroCard({ p }: { p: PublicProduct }) {
  const { rate } = useCart();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-sm [perspective:1200px]">
      <div className="absolute -inset-10 -z-10 animate-spin-slow rounded-full opacity-60 blur-3xl" style={{ background: `conic-gradient(from 0deg, ${p.color}66, #22d3ee55, #a78bfa55, ${p.color}66)` }} />
      <div
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 12 });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="pass-card glass relative rounded-[2rem] p-6 shadow-2xl transition-transform duration-200 ease-out"
        style={{ ["--c" as string]: p.color, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="glow" />
        <div className="flex items-center justify-between">
          <span className="chip border-amber-300/30 bg-amber-300/15 text-gold">
            <Crown className="size-3.5" /> พาสสูงสุด
          </span>
          <span className="chip">
            <Sparkles className="size-3.5 text-leaf" /> ใช้ได้ถาวร
          </span>
        </div>
        <div className="relative mx-auto mt-6 size-44">
          <div className="absolute inset-0 animate-pulse rounded-full blur-2xl" style={{ background: `${p.color}55` }} />
          <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="relative size-44 rounded-[2rem] ring-1 ring-white/15" />
        </div>
        <h3 className="mt-6 text-center text-3xl font-extrabold">{p.name}</h3>
        <p className="mt-1 text-center text-sm text-muted">{p.blurb}</p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs text-dim line-through">{formatNumber(p.priceRobux)} R$</p>
            <p className="text-3xl font-black text-gradient">฿{formatNumber(itemBaht(p.priceRobux, rate))}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpen(true)} className="btn btn-ghost !px-3 text-sm">
              ดูสิทธิ์
            </button>
            <AddToCartButton id={p.id} />
          </div>
        </div>
      </div>
      {open && <PerksModal p={p} onClose={() => setOpen(false)} />}
    </div>
  );
}
