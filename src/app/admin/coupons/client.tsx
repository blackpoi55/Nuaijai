"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { createCouponsAction, deleteUnusedCouponsAction, toggleCouponAction, toggleCouponBatchAction } from "@/app/actions/admin";

export function CouponForm() {
  const [state, action, pending] = useActionState(createCouponsAction, undefined);
  const [kind, setKind] = useState<"points" | "discount">("points");
  const [named, setNamed] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <form action={action} className="glass space-y-4 rounded-3xl p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <Plus className="size-4 text-leaf" /> สร้างคูปอง
      </h2>
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 text-sm sm:max-w-sm">
        {(
          [
            ["points", "แต้มฟรี"],
            ["discount", "ส่วนลดตอนซื้อ"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg py-2 font-semibold ${kind === k ? "bg-white/10" : "text-muted"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kind === "points" ? (
          <L label="ได้แต้ม">
            <input name="points" required inputMode="decimal" placeholder="เช่น 50" className="input" />
          </L>
        ) : (
          <>
            <L label="ส่วนลด">
              <div className="flex gap-2">
                <input name="discountValue" required inputMode="numeric" placeholder="10" className="input" />
                <select name="discountType" className="input !w-24">
                  <option value="percent">%</option>
                  <option value="baht">บาท</option>
                </select>
              </div>
            </L>
            <L label="ยอดขั้นต่ำ (บาท)" hint="0 = ไม่มี">
              <input name="minBaht" defaultValue="0" inputMode="numeric" className="input" />
            </L>
          </>
        )}
        <L label="หมดอายุ (เวลาไทย)" hint="ว่าง = ไม่หมดอายุ">
          <input name="expiresAt" type="datetime-local" className="input" />
        </L>
        <L label="หมายเหตุ" hint="แอดมินเห็นคนเดียว">
          <input name="note" placeholder="เช่น แจกไลฟ์ 13 พ.ย." className="input" />
        </L>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 text-sm sm:max-w-sm">
        <button type="button" onClick={() => setNamed(false)} className={`rounded-lg py-2 font-semibold ${!named ? "bg-white/10" : "text-muted"}`}>
          สุ่มโค้ดหลายใบ
        </button>
        <button type="button" onClick={() => setNamed(true)} className={`rounded-lg py-2 font-semibold ${named ? "bg-white/10" : "text-muted"}`}>
          ตั้งชื่อโค้ดเอง
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {named ? (
          <>
            <L label="ชื่อโค้ด" hint="A-Z 0-9 - _ เช่น OPEN50">
              <input name="custom" required className="input font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} />
            </L>
            <L label="ใช้ได้กี่คน" hint="คนละครั้ง">
              <input name="maxUses" defaultValue="100" inputMode="numeric" className="input" />
            </L>
          </>
        ) : (
          <>
            <L label="จำนวนโค้ด" hint="สูงสุด 500 ใบต่อครั้ง">
              <input name="quantity" defaultValue="10" inputMode="numeric" className="input" />
            </L>
            <L label="แต่ละโค้ดใช้ได้กี่คน" hint="ปกติ 1 = โค้ดละคน">
              <input name="maxUses" defaultValue="1" inputMode="numeric" className="input" />
            </L>
            <L label="ขึ้นต้นด้วย (ไม่บังคับ)" hint="เช่น LOY → LOY-XXXXXXXX">
              <input name="prefix" className="input font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} />
            </L>
          </>
        )}
      </div>

      {state?.error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <div className="space-y-2 rounded-xl bg-leaf/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-leaf">{state.ok}</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText((state.codes ?? []).join("\n"));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
            >
              {copied ? <Check className="size-4 text-leaf" /> : <Copy className="size-4" />} คัดลอกโค้ดทั้งหมด
            </button>
          </div>
          <p className="max-h-32 overflow-y-auto font-mono text-xs text-muted">{state.codes?.join("  ")}</p>
        </div>
      )}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "กำลังสร้าง..." : "สร้างคูปอง"}
      </button>
    </form>
  );
}

export function CouponToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => toggleCouponAction(id, !active))}
      className={`chip shrink-0 cursor-pointer ${active ? "border-leaf/30 bg-leaf/10 text-leaf" : "text-dim"}`}
    >
      {active ? "เปิด" : "ปิด"}
    </button>
  );
}

export function BatchActions({ batch, codes, anyActive, unused }: { batch: string; codes: string[]; anyActive: boolean; unused: number }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn btn-ghost !px-3 !py-1.5 text-xs"
      >
        {copied ? <Check className="size-4 text-leaf" /> : <Copy className="size-4" />} คัดลอกทั้งชุด ({codes.length})
      </button>
      <button disabled={pending} onClick={() => start(() => toggleCouponBatchAction(batch, !anyActive))} className="btn btn-ghost !px-3 !py-1.5 text-xs">
        {anyActive ? "ปิดทั้งชุด" : "เปิดทั้งชุด"}
      </button>
      {unused > 0 && (
        <button
          disabled={pending}
          onClick={() => confirm(`ลบโค้ดที่ยังไม่มีใครใช้ ${unused} ใบ?`) && start(() => deleteUnusedCouponsAction(batch))}
          className="btn !px-3 !py-1.5 text-xs text-danger hover:bg-danger/10"
        >
          ลบที่ยังไม่ใช้ ({unused})
        </button>
      )}
    </div>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </label>
  );
}
