"use client";

import { ShoppingBag, TicketPercent } from "lucide-react";
import { useCart } from "./cart";
import { CopyButton } from "./ui";

type Item = { code: string; label: string; kind: "points" | "discount"; expiresAt: string | null; minBaht: number };

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

// คูปองส่วนตัวที่ยังไม่ได้ใช้ (เช่น ได้จากวงล้อ)
export function MyCoupons({ items }: { items: Item[] }) {
  const { openCartWithCoupon, count } = useCart();
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <TicketPercent className="size-5 text-gold" /> คูปองของฉัน
        <span className="chip text-gold">{items.length} ใบ</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <div key={c.code} className="relative flex overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-amber-200/10 to-transparent">
            <div className="grid w-24 shrink-0 place-items-center border-r border-dashed border-gold/30 px-2 text-center">
              <span className="font-display text-xl font-semibold leading-tight text-gold">{c.label}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5">
              <p className="truncate font-mono text-sm font-semibold tracking-wider">{c.code}</p>
              <p className="text-[11px] text-dim">
                {c.minBaht > 0 ? `ขั้นต่ำ ฿${c.minBaht} • ` : ""}
                {c.expiresAt ? `ใช้ได้ถึง ${fmt.format(new Date(c.expiresAt))}` : "ไม่มีวันหมดอายุ"}
              </p>
              <div className="flex gap-2">
                {c.kind === "discount" && (
                  <button
                    onClick={() => openCartWithCoupon(c.code)}
                    disabled={count === 0}
                    title={count === 0 ? "ใส่ของในตะกร้าก่อน" : undefined}
                    className="btn btn-primary !px-3 !py-1.5 text-xs"
                  >
                    <ShoppingBag className="size-3.5" /> ใช้ในตะกร้า
                  </button>
                )}
                <CopyButton text={c.code} className="!py-1.5 text-xs" />
              </div>
            </div>
            <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-ink" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-dim">คูปองส่วนลดใช้ได้ตอนซื้อ — ใส่ของในตะกร้าแล้วแตะคูปองในตะกร้าได้เลย</p>
    </section>
  );
}
