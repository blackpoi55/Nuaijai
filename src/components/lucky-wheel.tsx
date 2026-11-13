"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { spinAction, type SpinResult } from "@/app/actions/wheel";
import { CopyButton } from "./ui";

type Prize = { id: number; label: string; kind: string; color: string; chance: number; image: string | null; qty: number };

// ไอคอนในเหรียญกรอบทอง (วาดรอบจุด 0,0 ขนาดประมาณ 44px)
function PrizeIcon({ p, uid }: { p: Prize; uid: string }) {
  const ring = (
    <>
      <circle r="23" fill="#0a0908" fillOpacity=".55" />
      <circle r="23" fill="none" stroke="url(#rim)" strokeWidth="2.5" />
    </>
  );
  if (p.kind === "item" && p.image)
    return (
      <g>
        <clipPath id={uid}>
          <circle r="21" />
        </clipPath>
        <circle r="23" fill="#0a0908" />
        <image href={p.image} x="-21" y="-21" width="42" height="42" clipPath={`url(#${uid})`} preserveAspectRatio="xMidYMid slice" />
        <circle r="23" fill="none" stroke="url(#rim)" strokeWidth="2.5" />
        {p.qty > 1 && (
          // ป้ายจำนวน (ทับตัวเลขที่พิมพ์อยู่ในรูปเดิม)
          <g transform="translate(0 15)">
            <rect x="-13" y="-7.5" width="26" height="15" rx="7.5" fill="url(#coin)" stroke="#0a0908" strokeOpacity=".5" />
            <text y="0.5" textAnchor="middle" dominantBaseline="middle" fill="#2a1d08" style={{ fontSize: 10, fontWeight: 800 }}>
              ×{p.qty}
            </text>
          </g>
        )}
      </g>
    );
  if (p.kind === "points")
    return (
      <g>
        {ring}
        <circle r="14" fill="url(#coin)" stroke="#8a6a35" strokeWidth="1.5" />
        <circle r="10.5" fill="none" stroke="#8a6a35" strokeOpacity=".6" strokeWidth="1" />
        <text y="1" textAnchor="middle" dominantBaseline="middle" fill="#5a4220" style={{ fontSize: 13, fontWeight: 800 }}>
          P
        </text>
      </g>
    );
  if (p.kind === "coupon")
    return (
      <g>
        {ring}
        <path d="M-15 -9 H15 V-3 A3 3 0 0 0 15 3 V9 H-15 V3 A3 3 0 0 0 -15 -3 Z" fill="url(#coin)" stroke="#8a6a35" strokeWidth="1.2" />
        <text y="1" textAnchor="middle" dominantBaseline="middle" fill="#5a4220" style={{ fontSize: 11, fontWeight: 800 }}>
          %
        </text>
      </g>
    );
  if (p.kind === "item")
    return (
      <g>
        {ring}
        <rect x="-11" y="-6" width="22" height="15" rx="2" fill="url(#coin)" />
        <rect x="-13" y="-10" width="26" height="6" rx="1.5" fill="#f6e3b4" />
        <rect x="-2" y="-10" width="4" height="19" fill="#8a6a35" />
      </g>
    );
  // เกือบได้: ประกายดาว
  return (
    <g>
      {ring}
      <path d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14 Z" fill="url(#coin)" />
      <circle cx="9" cy="-9" r="2" fill="#fff6dc" />
    </g>
  );
}

function textColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#1c1406" : "#f4eee3";
}

const R = 200;
const r2 = (v: number) => Math.round(v * 100) / 100; // ตัดทศนิยม ให้เซิร์ฟเวอร์กับเบราว์เซอร์ได้ค่าเดียวกัน
function slice(i: number, n: number) {
  const a0 = ((i / n) * 360 - 90) * (Math.PI / 180);
  const a1 = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
  const large = 360 / n > 180 ? 1 : 0;
  return `M0 0 L${r2(R * Math.cos(a0))} ${r2(R * Math.sin(a0))} A${R} ${R} 0 ${large} 1 ${r2(R * Math.cos(a1))} ${r2(R * Math.sin(a1))} Z`;
}

export function LuckyWheel({ prizes, credits: initialCredits, signedIn }: { prizes: Prize[]; credits: number; signedIn: boolean }) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [result, setResult] = useState<Extract<SpinResult, { ok: true }> | null>(null);
  const [err, setErr] = useState("");
  const pending = useRef<Extract<SpinResult, { ok: true }> | null>(null);
  const router = useRouter();
  const n = Math.max(prizes.length, 1);
  const seg = 360 / n;

  const spin = async () => {
    if (spinning || credits <= 0) return;
    setErr("");
    setSpinning(true);
    const r = await spinAction();
    if (!r.ok) {
      setSpinning(false);
      setErr(r.message);
      return;
    }
    pending.current = r;
    const idx = Math.max(0, prizes.findIndex((p) => p.id === r.prizeId));
    // หมุนอย่างน้อย 6 รอบ แล้วหยุดให้กลางช่องรางวัลอยู่ใต้ลูกศรด้านบน (สุ่มตำแหน่งในช่องนิดหน่อยให้ดูเป็นธรรมชาติ)
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const target = 360 - (idx * seg + seg / 2) + jitter;
    setRot((cur) => cur + 360 * 6 + (((target - (cur % 360)) % 360) + 360) % 360);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[min(88vw,420px)]">
        <div className="absolute -inset-10 -z-10 rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, rgb(226 194 125 / 0.25), transparent 65%)" }} />
        {/* ลูกศร */}
        <svg viewBox="0 0 40 46" className="absolute left-1/2 top-0 z-10 w-10 -translate-x-1/2 -translate-y-3 drop-shadow-[0_4px_10px_rgb(0_0_0/0.6)]">
          <defs>
            <linearGradient id="pin" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff6dc" />
              <stop offset="1" stopColor="#c49a55" />
            </linearGradient>
          </defs>
          <path d="M20 46 L4 10 A16 16 0 1 1 36 10 Z" fill="url(#pin)" stroke="#1c1406" strokeOpacity=".4" />
          <circle cx="20" cy="14" r="5" fill="#1c1406" fillOpacity=".55" />
        </svg>

        <svg viewBox="-220 -220 440 440" className="w-full">
          <defs>
            <linearGradient id="rim" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f6e3b4" />
              <stop offset=".5" stopColor="#b88c47" />
              <stop offset="1" stopColor="#f3e3bd" />
            </linearGradient>
            <linearGradient id="coin" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fff6dc" />
              <stop offset=".55" stopColor="#e2c27d" />
              <stop offset="1" stopColor="#b88c47" />
            </linearGradient>
            <clipPath id="hub">
              <circle r="44" />
            </clipPath>
            <radialGradient id="shade">
              <stop offset=".55" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity=".35" />
            </radialGradient>
          </defs>
          <circle r="216" fill="#0a0908" stroke="url(#rim)" strokeWidth="8" />
          {/* ไฟรอบวง */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <circle key={i} cx={r2(208 * Math.cos(a))} cy={r2(208 * Math.sin(a))} r="3.2" fill={i % 2 ? "#fff6dc" : "#e2c27d"} opacity={spinning ? (i % 2 ? 1 : 0.4) : 0.85} />;
          })}
          <g
            style={{
              transform: `rotate(${rot}deg)`,
              transformBox: "view-box",
              transformOrigin: "0px 0px", // จุด (0,0) ของ viewBox = กลางวงล้อ
              transition: spinning ? "transform 5.2s cubic-bezier(.12,.8,.18,1)" : "none",
            }}
            onTransitionEnd={() => {
              setSpinning(false);
              if (pending.current) {
                setCredits(pending.current.credits);
                setResult(pending.current);
                pending.current = null;
                router.refresh();
              }
            }}
          >
            {prizes.map((p, i) => {
              const mid = i * seg + seg / 2;
              const fill = textColor(p.color);
              return (
                <g key={p.id}>
                  <path d={slice(i, n)} fill={p.color} stroke="#0a0908" strokeWidth="2" />
                  <g transform={`rotate(${mid})`}>
                    {/* รูป/ไอคอนรางวัลด้านนอก */}
                    <g transform={`translate(0 ${-R * 0.77})`}>
                      <PrizeIcon p={p} uid={`pi${p.id}`} />
                    </g>
                    {/* ชื่อรางวัลด้านใน (อ่านตามรัศมี) */}
                    <text
                      x="0"
                      y={-R * 0.43}
                      transform={`rotate(${mid <= 180 ? -90 : 90} 0 ${-R * 0.43})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={fill}
                      style={{ fontSize: n > 10 ? 11 : 13, fontWeight: 600, fontFamily: "var(--font-prompt)" }}
                    >
                      {p.label}
                    </text>
                  </g>
                </g>
              );
            })}
            <circle r={R} fill="url(#shade)" pointerEvents="none" />
          </g>
          {/* ปุ่มกลาง: โลโก้เหนื่อยใจ */}
          <circle r="47" fill="#12100e" />
          <image href="/icons/192.png" x="-44" y="-44" width="88" height="88" clipPath="url(#hub)" preserveAspectRatio="xMidYMid slice" />
          <circle r="44" fill="#000" fillOpacity={spinning ? 0.25 : 0.5} />
          <circle r="46" fill="none" stroke="url(#rim)" strokeWidth="5" />
        </svg>
        <button
          onClick={spin}
          disabled={!signedIn || spinning || credits <= 0}
          className="absolute left-1/2 top-1/2 grid size-[20%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-display text-base font-semibold text-champagne transition [text-shadow:0_2px_8px_rgb(0_0_0/0.9)] hover:scale-105 disabled:opacity-70 sm:text-lg"
          aria-label="หมุนวงล้อ"
        >
          {spinning ? "…" : "หมุน"}
        </button>
      </div>

      <div className="mt-8 text-center">
        {signedIn ? (
          <>
            <p className="text-sm text-muted">สิทธิ์หมุนคงเหลือ</p>
            <p className="font-display text-4xl font-semibold text-gold">{credits}</p>
            <button onClick={spin} disabled={spinning || credits <= 0} className="btn btn-primary mt-5 !px-10 !py-3.5 text-base">
              <Sparkles className="size-5" /> {spinning ? "กำลังหมุน..." : credits > 0 ? "หมุนวงล้อ" : "ยังไม่มีสิทธิ์"}
            </button>
          </>
        ) : (
          <Link href="/login?next=/wheel" className="btn btn-primary !px-10 !py-3.5 text-base">
            เข้าสู่ระบบเพื่อหมุน
          </Link>
        )}
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      </div>

      {result && (
        <div className="fixed inset-0 z-[85] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setResult(null)} />
          {result.kind !== "none" && <GoldBurst />}
          <div className="animate-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-gold/40 bg-ink-2 p-8 text-center shadow-2xl">
            <button onClick={() => setResult(null)} className="absolute right-4 top-4 p-1 text-dim hover:text-fg" aria-label="ปิด">
              <X className="size-5" />
            </button>
            <p className="eyebrow">{result.kind === "none" ? "Almost" : "You won"}</p>
            <p className="mt-4 font-display text-4xl font-semibold text-gradient">{result.label}</p>
            <p className="mt-3 text-sm text-muted">{result.detail}</p>
            {result.reward && (
              <div className="mt-5 flex items-center justify-between gap-2 rounded-2xl border border-line bg-black/30 px-4 py-3">
                <span className="font-mono text-lg font-semibold tracking-wider">{result.reward}</span>
                <CopyButton text={result.reward} />
              </div>
            )}
            <div className="mt-7 flex justify-center gap-2">
              {credits > 0 ? (
                <button
                  onClick={() => {
                    setResult(null);
                    setTimeout(spin, 150);
                  }}
                  className="btn btn-primary"
                >
                  หมุนอีก ({credits})
                </button>
              ) : (
                <Link href="/#passes" className="btn btn-primary">
                  ช้อปเพื่อรับสิทธิ์
                </Link>
              )}
              {result.kind === "item" && (
                <Link href="/orders" className="btn btn-ghost">
                  โค้ดของฉัน
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// พลุกระดาษสีทองตอนได้รางวัล
function GoldBurst() {
  const colors = ["#fff6dc", "#f3e3bd", "#e2c27d", "#c49a55", "#b88c47"];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 46 }, (_, i) => {
        const left = (i * 53) % 100;
        const delay = (i % 9) * 0.07;
        const dur = 2.4 + (i % 5) * 0.35;
        const size = 6 + (i % 4) * 3;
        return (
          <span
            key={i}
            className="absolute top-[-5%] block rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size * (i % 3 === 0 ? 0.45 : 1),
              background: colors[i % colors.length],
              borderRadius: i % 4 === 0 ? 9999 : 2,
              boxShadow: "0 0 8px rgb(226 194 125 / 0.6)",
              animation: `nh-fall ${dur}s ${delay}s cubic-bezier(.3,.6,.4,1) forwards`,
            }}
          />
        );
      })}
      <style>{`@keyframes nh-fall{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(110vh) rotate(720deg);opacity:.2}}`}</style>
    </div>
  );
}
