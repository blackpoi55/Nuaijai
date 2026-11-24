"use client";

import { ArrowDown, Bell, Flame } from "lucide-react";
import Link from "next/link";
import type { Festival } from "@/lib/festivals";
import type { PublicProduct } from "@/lib/products";
import { endLabel, splitLeft, thaiWhen, useCountdown } from "./countdown";
import { PassIcon } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86400_000;

/**
 * ป้ายใหญ่นับถอยหลังของเทศกาล
 *   closing = ของลิมิเต็ดที่กำลังจะปิดขาย (ยิ่งใกล้ยิ่งร้อน: เหลือ ≤ 3 วันเป็นส้ม, ≤ 24 ชม. เป็นแดงกระพริบ)
 *   opening = ของที่ยังไม่เปิดขาย
 */
export function FestivalDrop({ mode, to, fest, items, anchor }: { mode: "closing" | "opening"; to: string; fest: Festival; items: PublicProduct[]; anchor: string }) {
  const left = useCountdown(to);
  const closing = mode === "closing";
  const hot = closing && left !== null && left <= DAY;
  const warm = closing && left !== null && left <= 3 * DAY;
  const t = splitLeft(left ?? 0);
  const when = closing ? endLabel(to) : thaiWhen.format(new Date(to));

  const head = !closing ? "เปิดขายใน" : hot ? "วันสุดท้าย! ปิดใน" : warm ? "ใกล้ปิดแล้ว! เหลือ" : "ปิดขายใน";
  const tiles = [
    { v: t.d, l: "วัน" },
    { v: t.h, l: "ชั่วโมง" },
    { v: t.m, l: "นาที" },
    { v: t.s, l: "วินาที" },
  ];

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-[2rem] border p-5 sm:p-8 ${hot ? "border-danger/60" : "border-white/10"}`}
      style={{
        background: `radial-gradient(120% 140% at 0% 0%, ${fest.c1}38, transparent 55%), radial-gradient(120% 140% at 100% 100%, ${fest.c2}30, transparent 55%), #12100e`,
      }}
    >
      {/* แสงฟุ้งสีเทศกาล */}
      <div className="pointer-events-none absolute -left-16 -top-20 size-72 rounded-full opacity-50 blur-3xl" style={{ background: fest.c1 }} />
      <div className="pointer-events-none absolute -bottom-24 -right-10 size-80 rounded-full opacity-40 blur-3xl" style={{ background: fest.c2 }} />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-champagne/80">
            {closing ? (
              <span className={`relative flex size-2 ${hot ? "" : "hidden"}`}>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-danger" />
              </span>
            ) : null}
            {fest.emoji} {closing ? "ลิมิเต็ด · ขายช่วงเทศกาลเท่านั้น" : "ของใหม่ · เร็วๆ นี้"}
          </p>
          <h3 className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="bg-clip-text font-display text-3xl font-semibold text-transparent sm:text-5xl"
              style={{ backgroundImage: `linear-gradient(90deg, ${fest.c1}, ${fest.c2})` }}
            >
              {fest.name}
            </span>
            <span className={`flex items-center gap-1.5 text-xl font-semibold sm:text-2xl ${hot ? "text-danger" : "text-fg"}`}>
              {closing ? <Flame className={`size-5 shrink-0 ${hot ? "animate-pulse" : ""}`} style={hot ? undefined : { color: fest.c1 }} /> : <Bell className="size-5 shrink-0" style={{ color: fest.c2 }} />}
              {head}
            </span>
          </h3>

          {/* ตัวเลขใหญ่ */}
          <div className="mt-4 grid max-w-md grid-cols-4 gap-2 sm:gap-3">
            {tiles.map((x) => (
              <div
                key={x.l}
                className={`rounded-2xl border bg-black/45 px-1 py-2.5 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] sm:py-3.5 ${hot ? "border-danger/50" : "border-white/10"}`}
              >
                <span
                  key={left === null ? "-" : x.v}
                  className={`block font-display text-3xl font-semibold tabular-nums leading-none sm:text-5xl ${x.l === "วินาที" ? "animate-pop" : ""} ${hot ? "text-danger" : "text-fg"}`}
                >
                  {left === null ? "--" : pad(x.v)}
                </span>
                <span className="mt-1.5 block text-[11px] text-muted sm:text-xs">{x.l}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted">
            {closing ? (
              <>
                {items.length} ชิ้น ขายถึง <b className="text-champagne">{when} น.</b> เท่านั้น — หมดเวลาแล้ว<b className="text-champagne">ไม่กลับมาขายอีก</b>
              </>
            ) : (
              <>
                {items.length} ชิ้นใหม่ เปิดขาย <b className="text-champagne">{when} น.</b> — ถึงเวลาเปิดเองอัตโนมัติ เตรียมแต้มรอไว้ได้เลย
              </>
            )}
          </p>
        </div>

        {/* รูปของ + ปุ่ม */}
        <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end">
          <div className="flex -space-x-3">
            {items.slice(0, 5).map((p) => (
              <PassIcon key={p.id} src={p.iconUrl} name={p.name} color={p.color} className="size-12 rounded-2xl border-2 border-ink-2 shadow-lg sm:size-16" />
            ))}
          </div>
          {closing ? (
            <a href={`#${anchor}`} className="btn btn-primary shrink-0 !px-5 !py-3">
              เลือกเลย <ArrowDown className="size-4" />
            </a>
          ) : (
            <Link href="/topup" className="btn btn-ghost shrink-0 !px-5 !py-3">
              เติมแต้มรอ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** แถบเล็กบนสุดของหน้าแรก (ใน hero): เตือนว่าของเทศกาลกำลังจะปิด/เปิด กดแล้วเลื่อนลงไปดู */
export function DropTicker({ mode, to, fest, href }: { mode: "closing" | "opening"; to: string; fest: Festival; href: string }) {
  const left = useCountdown(to);
  const hot = mode === "closing" && left !== null && left <= DAY;
  const t = splitLeft(left ?? 0);
  return (
    <a
      href={href}
      className={`group mb-7 inline-flex max-w-full items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm backdrop-blur transition hover:bg-white/5 ${
        hot ? "border-danger/60 bg-danger/10" : "border-white/15 bg-black/30"
      }`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-full px-2.5 py-1 text-xs font-bold text-ink ${hot ? "animate-pulse bg-danger text-white" : ""}`}
        style={hot ? undefined : { background: `linear-gradient(90deg, ${fest.c1}, ${fest.c2})` }}
      >
        {fest.emoji} {fest.name}
      </span>
      <span className="truncate text-muted">{mode === "closing" ? "ปิดขายใน" : "เปิดขายใน"}</span>
      <span className={`whitespace-nowrap font-semibold tabular-nums ${hot ? "text-danger" : "text-fg"}`}>
        {left === null ? "…" : `${t.d > 0 ? `${t.d} วัน ` : ""}${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`}
      </span>
      <ArrowDown className="size-4 shrink-0 text-gold transition group-hover:translate-y-0.5" />
    </a>
  );
}
