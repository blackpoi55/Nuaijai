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
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">ลิงก์ทักแอดมิน (Discord)</span>
        <input name="contactUrl" defaultValue={initial.contactUrl} placeholder="https://discord.com/users/..." className="input" />
        <span className="mt-1 block text-xs text-dim">แสดงเป็นปุ่ม ‘ทักแอดมินให้ตรวจเร็ว’ ในหน้าเติมแต้มพร้อมเพย์ • ว่าง = ไม่แสดง</span>
      </label>
      <div className="space-y-2">
        <span className="block text-sm font-semibold">การขาย</span>
        <Toggle name="shopOpen" on={initial.shopOpen} label="เปิดขาย" hint="ปิด = ดูสินค้าได้ แต่กดซื้อไม่ได้" />
      </div>
      <div className="space-y-2">
        <span className="block text-sm font-semibold">วิธีเติมแต้ม</span>
        <Toggle name="angpaoOpen" on={initial.angpaoOpen} label="ซองอั่งเปา TrueMoney" hint="ปิด = ซ่อนจากหน้าเติมแต้ม และระบบไม่รับซอง" />
        <Toggle name="promptpayOpen" on={initial.promptpayOpen} label="พร้อมเพย์ + แนบสลิป" hint="ปิด = ซ่อนจากหน้าเติมแต้ม และระบบไม่รับสลิปใหม่ (สลิปที่ส่งมาแล้วยังตรวจได้)" />
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-leaf" : "text-danger"}`}>{state.ok ?? state.error}</p>}
      <button disabled={pending} className="btn btn-primary">
        บันทึก
      </button>
    </form>
  );
}

function Toggle({ name, on, label, hint }: { name: string; on: boolean; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-black/20 p-3.5">
      <input type="checkbox" name={name} defaultChecked={on} className="peer sr-only" />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-emerald-400 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-dim">{hint}</span>
      </span>
    </label>
  );
}
