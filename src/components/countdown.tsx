"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

/** "6 วัน 14:02:11" (เหลือไม่ถึงวันตัดคำว่าวันทิ้ง) */
export function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d > 0 ? `${d} วัน ${hms}` : hms;
}

export const thaiWhen = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/**
 * นับถอยหลังถึงเวลา `to` ทุกวินาที • ถึงเวลาแล้วรีเฟรชหน้าเอง (ของเปิดขาย/ปิดขายเองโดยไม่ต้องกดรีเฟรช)
 * ก่อนโหลดเสร็จแสดง fallback (กัน hydration ไม่ตรง เพราะเวลาเซิร์ฟเวอร์กับเครื่องผู้ใช้ต่างกัน)
 */
export function Countdown({ to, fallback = "" }: { to: string; fallback?: string }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef({ at: 0, n: 0 });
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      // ถึงเวลาแล้วรีเฟรช — ถ้านาฬิกาเครื่องเร็วกว่าเซิร์ฟเวอร์ หน้ายังไม่เปลี่ยน ลองใหม่ทุก 10 วิ (สูงสุด 6 ครั้ง)
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
  return <span className="tabular-nums">{now === null ? fallback : formatLeft(target - now)}</span>;
}
