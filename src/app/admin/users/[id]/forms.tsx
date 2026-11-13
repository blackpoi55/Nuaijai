"use client";

import { useActionState, useState, useTransition } from "react";
import { adjustPointsAction, resetPasswordAction, setUserFlagsAction, unlockUserAction } from "@/app/actions/admin";

const MODES = [
  { id: "add", label: "เติมแต้ม", hint: "แจกหรือเติมให้ เช่น เติมแทนลูกค้า ของรางวัล", btn: "btn-primary" },
  { id: "refund", label: "คืนแต้ม", hint: "คืนให้ลูกค้า เช่น ซื้อผิด ระบบมีปัญหา", btn: "btn-gold" },
  { id: "deduct", label: "หักแต้ม", hint: "หักออก เช่น เติมผิด สลิปปลอม", btn: "border border-danger/40 bg-danger/15 text-danger" },
] as const;

export function AdjustForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(adjustPointsAction, undefined);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("add");
  const m = MODES.find((x) => x.id === mode)!;
  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-5">
      <h3 className="font-bold">เติม / คืน / หักแต้ม</h3>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="mode" value={mode} />
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-1 text-sm">
        {MODES.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setMode(x.id)}
            className={`rounded-lg py-2 font-semibold transition ${mode === x.id ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-dim">{m.hint}</p>
      <input name="amount" required inputMode="decimal" placeholder="จำนวนแต้ม เช่น 50" className="input" />
      <input name="note" placeholder="เหตุผล (ลูกค้าเห็นในประวัติแต้ม)" className="input" />
      <Msg s={state} />
      <button disabled={pending} className={`btn ${m.btn} !py-2 text-sm`}>
        {pending ? "กำลังบันทึก..." : `ยืนยัน${m.label}`}
      </button>
    </form>
  );
}

export function ResetForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-5">
      <h3 className="font-bold">ตั้งรหัสผ่านใหม่</h3>
      <p className="text-xs text-dim">ใช้ตอนลูกค้าลืมรหัส แล้วบอกรหัสใหม่ให้เขา</p>
      <input type="hidden" name="userId" value={userId} />
      <input name="password" required minLength={6} placeholder="รหัสผ่านใหม่" className="input" />
      <Msg s={state} />
      <button disabled={pending} className="btn btn-ghost !py-2 text-sm">
        ตั้งรหัสใหม่
      </button>
    </form>
  );
}

export function FlagButtons({ id, banned, admin }: { id: number; banned: boolean; admin: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => confirm(admin ? "ถอดสิทธิ์แอดมิน?" : "ให้สิทธิ์แอดมิน?") && start(() => setUserFlagsAction(id, { role: admin ? "user" : "admin" }))}
        className="btn btn-ghost !py-2 text-sm"
      >
        {admin ? "ถอดแอดมิน" : "ตั้งเป็นแอดมิน"}
      </button>
      <button
        disabled={pending}
        onClick={() => confirm(banned ? "ปลดระงับบัญชี?" : "ระงับบัญชีนี้?") && start(() => setUserFlagsAction(id, { banned: !banned }))}
        className={`btn !py-2 text-sm ${banned ? "btn-ghost" : "border border-danger/30 bg-danger/10 text-danger"}`}
      >
        {banned ? "ปลดระงับ" : "ระงับบัญชี"}
      </button>
    </div>
  );
}

function Msg({ s }: { s: { ok?: string; error?: string } | undefined }) {
  if (!s) return null;
  return <p className={`text-sm ${s.ok ? "text-leaf" : "text-danger"}`}>{s.ok ?? s.error}</p>;
}

export function UnlockBanner({ id, minutes, fails }: { id: number; minutes: number | null; fails: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <p className="mb-4 rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm font-semibold text-leaf">ปลดล็อกแล้ว ผู้ใช้เข้าสู่ระบบได้ทันที</p>;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
      <p className="text-sm font-semibold text-gold">
        {minutes !== null ? `🔒 บัญชีถูกล็อกเพราะใส่รหัสผิดหลายครั้ง (เหลืออีก ${minutes} นาที)` : `⚠ ใส่รหัสผิดติดกัน ${fails} ครั้ง (ครบ 5 จะถูกล็อก)`}
      </p>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await unlockUserAction(id);
            setDone(true);
          })
        }
        className="btn btn-gold !py-2 text-sm"
      >
        {pending ? "กำลังปลดล็อก..." : minutes !== null ? "ปลดล็อกเลย" : "ล้างตัวนับ"}
      </button>
    </div>
  );
}
