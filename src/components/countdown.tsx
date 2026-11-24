"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

/** แยกเวลาที่เหลือเป็น วัน ชม. นาที วิ */
export function splitLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** "6 วัน 14:02:11" (เหลือไม่ถึงวันตัดคำว่าวันทิ้ง) */
export function formatLeft(ms: number) {
  const { d, h, m, s } = splitLeft(ms);
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d} วัน ${hms}` : hms;
}

export const thaiWhen = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
/** เวลาปิดขาย: ถ้าปิดตอนเที่ยงคืนพอดี แสดงเป็น 23:59 ของวันก่อน (คนอ่าน "1 ธ.ค. 00:00" แล้วนึกว่าขายทั้งวันที่ 1) */
export function endLabel(iso: string) {
  const t = new Date(iso).getTime();
  const bkk = new Date(t + 7 * 3600_000);
  const midnight = bkk.getUTCHours() === 0 && bkk.getUTCMinutes() === 0;
  return thaiWhen.format(new Date(midnight ? t - 60_000 : t));
}

export const thaiDay = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

/**
 * เวลาที่เหลือถึง `to` อัปเดตทุกวินาที (null = ยังไม่ mount — กัน hydration ไม่ตรง)
 * ถึงเวลาแล้วรีเฟรชหน้าเอง ของจึงเปิดขาย/ปิดขายเองโดยไม่ต้องกดรีเฟรช
 * ถ้านาฬิกาเครื่องเร็วกว่าเซิร์ฟเวอร์ หน้ายังไม่เปลี่ยน ลองใหม่ทุก 10 วิ (สูงสุด 6 ครั้ง)
 */
export function useCountdown(to: string | null) {
  const router = useRouter();
  const target = to ? new Date(to).getTime() : NaN;
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef({ at: 0, n: 0 });
  useEffect(() => {
    if (Number.isNaN(target)) return; // ไม่มีเวลาให้นับ (ของขายถาวร)
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const f = fired.current;
      if (t >= target + 1500 && f.n < 6 && t - f.at > 10_000) {
        f.at = t;
        f.n++;
        router.refresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, router]);
  return now === null || Number.isNaN(target) ? null : Math.max(0, target - now);
}

export function Countdown({ to, fallback = "" }: { to: string; fallback?: string }) {
  const left = useCountdown(to);
  return <span className="tabular-nums">{left === null ? fallback : formatLeft(left)}</span>;
}
