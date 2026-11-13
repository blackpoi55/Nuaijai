"use client";

import { useState } from "react";
import type { PublicProduct } from "@/lib/products";
import { formatNumber, itemBaht } from "@/lib/pricing";
import { AddToCartButton, useCart } from "./cart";
import { PerksModal } from "./product-card";
import { PassIcon } from "./ui";

// พาสเด่นในส่วนหัว: รูปใหญ่ กรอบทอง เอียงตามเมาส์เบาๆ
export function HeroCard({ p }: { p: PublicProduct }) {
  const { rate } = useCart();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-sm [perspective:1400px]">
      <div className="absolute -inset-16 -z-10 rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, rgb(226 194 125 / 0.22), transparent 65%)" }} />
      <div
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -6, y: ((e.clientX - r.left) / r.width - 0.5) * 8 });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        onClick={() => setOpen(true)}
        className="pass-card glass relative cursor-pointer rounded-[2.25rem] p-3 shadow-2xl shadow-black/60 transition-transform duration-300 ease-out"
        style={{ ["--c" as string]: p.color, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="glow" />
        <div className="relative overflow-hidden rounded-[1.75rem]">
          <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="aspect-square w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 via-45% to-transparent" />
          <p className="eyebrow absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1.5 !text-[0.6rem] backdrop-blur">Signature</p>
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-3xl font-semibold [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]">{p.name}</h3>
              <p className="mt-1 font-display text-2xl text-gold [text-shadow:0_2px_10px_rgb(0_0_0/0.8)]">฿{formatNumber(itemBaht(p.priceRobux, rate))}</p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <AddToCartButton id={p.id} label="เพิ่ม" />
            </div>
          </div>
        </div>
      </div>
      {open && <PerksModal p={p} onClose={() => setOpen(false)} />}
    </div>
  );
}
