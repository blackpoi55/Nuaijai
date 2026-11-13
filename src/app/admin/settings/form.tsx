"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions/admin";
import type { ShopSettings } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: ShopSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form action={action} className="glass space-y-5 rounded-3xl p-6">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">อัตรา Robux ต่อ 1 บาท</span>
        <input name="robuxPerBaht" defaultValue={initial.robuxPerBaht} inputMode="numeric" className="input max-w-40" />
        <span className="mt-1 block text-xs text-dim">ราคาบาท = ปัดขึ้น(Robux รวมทั้งตะกร้า ÷ ค่านี้)</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">ประกาศบนเว็บ</span>
        <input name="announcement" defaultValue={initial.announcement} placeholder="ว่าง = ไม่แสดง" className="input" maxLength={300} />
      </label>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shopOpen" defaultChecked={initial.shopOpen} className="size-4 accent-emerald-400" /> เปิดขาย
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="topupOpen" defaultChecked={initial.topupOpen} className="size-4 accent-emerald-400" /> เปิดรับเติมแต้ม
        </label>
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-leaf" : "text-danger"}`}>{state.ok ?? state.error}</p>}
      <button disabled={pending} className="btn btn-primary">
        บันทึก
      </button>
    </form>
  );
}
