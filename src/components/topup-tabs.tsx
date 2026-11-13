"use client";

import { useState } from "react";
import { Gift, QrCode } from "lucide-react";
import { PromptPayForm } from "./promptpay-form";
import { TopupForm } from "./topup-form";

type Method = "angpao" | "promptpay";

export function TopupTabs({
  angpaoOpen,
  promptpayOpen,
  promptpayId,
  contactUrl,
}: {
  angpaoOpen: boolean;
  promptpayOpen: boolean;
  promptpayId: string;
  contactUrl: string;
}) {
  const methods: { id: Method; label: string; sub: string; icon: typeof Gift; on: boolean }[] = [
    { id: "angpao", label: "ซองอั่งเปา", sub: "TrueMoney • เข้าทันที", icon: Gift, on: angpaoOpen },
    { id: "promptpay", label: "พร้อมเพย์", sub: "แนบสลิป • แอดมินตรวจ", icon: QrCode, on: promptpayOpen && !!promptpayId },
  ];
  const open = methods.filter((m) => m.on);
  const [tab, setTab] = useState<Method>(open[0]?.id ?? "angpao");

  if (open.length === 0) return <p className="rounded-2xl bg-white/5 p-6 text-center text-muted">ปิดรับเติมแต้มชั่วคราว</p>;
  const current = open.find((m) => m.id === tab) ? tab : open[0].id;

  return (
    <div>
      {open.length > 1 && (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1.5">
          {open.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setTab(m.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${current === m.id ? "bg-white/10 shadow-inner" : "hover:bg-white/5"}`}
            >
              <m.icon className={`size-5 shrink-0 ${current === m.id ? (m.id === "angpao" ? "text-orange-300" : "text-sky-300") : "text-dim"}`} />
              <span>
                <span className={`block text-sm font-bold ${current === m.id ? "text-fg" : "text-muted"}`}>{m.label}</span>
                <span className="block text-[11px] text-dim">{m.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {current === "angpao" ? (
        <div>
          <TopupForm />
          <details className="group mt-5 text-sm [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted hover:text-fg">
              วิธีสร้างซองอั่งเปา <span className="text-gold transition group-open:rotate-45">+</span>
            </summary>
          <ol className="mt-4 space-y-3">
            {[
              ["เปิดแอป TrueMoney", "เมนู ‘ส่งซองของขวัญ’ หรือ ‘อั่งเปา’"],
              ["ใส่จำนวนเงิน แบ่งให้ 1 คน", "ถ้าแบ่งหลายคน ร้านจะได้แค่ส่วนเดียว"],
              ["คัดลอกลิงก์ซองมาวางด้านบน", "ลิงก์แบบ gift.truemoney.com/campaign/?v=... แต้มเข้าทันที"],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-gold/40 font-display text-xs text-gold">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          </details>
        </div>
      ) : (
        <PromptPayForm promptpayId={promptpayId} contactUrl={contactUrl} />
      )}
    </div>
  );
}
