"use client";

import { useActionState, useTransition } from "react";
import { adjustPointsAction, resetPasswordAction, setUserFlagsAction } from "@/app/actions/admin";

export function AdjustForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(adjustPointsAction, undefined);
  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-5">
      <h3 className="font-bold">ปรับแต้ม</h3>
      <input type="hidden" name="userId" value={userId} />
      <input name="amount" required inputMode="decimal" placeholder="จำนวน เช่น 50 หรือ -20" className="input" />
      <input name="note" required placeholder="เหตุผล (ลูกค้าเห็น)" className="input" />
      <Msg s={state} />
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">
        บันทึก
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
