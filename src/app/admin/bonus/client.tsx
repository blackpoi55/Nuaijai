"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarClock, Check, Plus, Trash2 } from "lucide-react";
import { deleteBonusAction, saveBonusAction, toggleBonusAction } from "@/app/actions/admin";
import { BonusBar } from "@/components/bonus-bar";
import type { BonusTier } from "@/lib/bonus-shared";

export type Opt = { id: number; name: string; kind: "pass" | "item" };
export type RuleRow = { id: number; minBaht: number; productId: number; qty: number; active: boolean; startsAt: string | null; endsAt: string | null };

// วันเวลาไทยสำหรับช่อง datetime-local
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16) : "");

/** หนึ่งขั้น: "ซื้อครบ ฿___ แถม [ของ] × __" (rule ว่าง = แถวเพิ่มขั้นใหม่) */
export function BonusRow({ rule, products, status }: { rule?: RuleRow; products: Opt[]; status?: [string, string] }) {
  const [state, action, pending] = useActionState(saveBonusAction, undefined);
  const [busy, start] = useTransition();
  const [pid, setPid] = useState(rule?.productId ?? products.find((p) => p.kind === "item")?.id ?? products[0]?.id);
  const [timed, setTimed] = useState(!!(rule?.startsAt || rule?.endsAt));
  const isPass = products.find((p) => p.id === pid)?.kind === "pass";

  return (
    <form action={action} className={`glass rounded-2xl p-4 ${rule && !rule.active ? "opacity-60" : ""}`}>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {status && <span className={`chip ${status[1]}`}>{status[0]}</span>}
        <label className="flex items-center gap-2 text-sm font-semibold">
          ซื้อครบ ฿
          <input name="minBaht" required defaultValue={rule?.minBaht ?? ""} placeholder="300" inputMode="numeric" className="input !w-24 text-center" />
        </label>
        <label className="flex w-full min-w-0 items-center gap-2 text-sm font-semibold sm:w-auto">
          แถม
          <select name="productId" value={pid} onChange={(e) => setPid(Number(e.target.value))} className="input min-w-0 flex-1 sm:w-56">
            <optgroup label="กล่อง / ตั๋ว">
              {products.filter((p) => p.kind === "item").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="พาส">
              {products.filter((p) => p.kind === "pass").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {isPass ? (
          <input key="one" type="hidden" name="qty" value="1" />
        ) : (
          <label key="qty" className="flex items-center gap-2 text-sm font-semibold">
            ×
            <input name="qty" defaultValue={rule?.qty ?? 1} inputMode="numeric" className="input !w-16 text-center" />
          </label>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setTimed(!timed)} className={`btn btn-ghost !p-2.5 ${timed ? "text-gold" : ""}`} title="ตั้งช่วงเวลา" aria-label="ตั้งช่วงเวลา">
            <CalendarClock className="size-4" />
          </button>
          <button disabled={pending} className="btn btn-primary !px-4 !py-2 text-sm">
            {rule ? <Check className="size-4" /> : <Plus className="size-4" />} {pending ? "..." : rule ? "บันทึก" : "เพิ่ม"}
          </button>
          {rule && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(() => toggleBonusAction(rule.id, !rule.active))}
                className={`btn !px-3 !py-2 text-sm ${rule.active ? "btn-ghost" : "border-leaf/30 bg-leaf/10 text-leaf"}`}
              >
                {rule.active ? "ปิด" : "เปิด"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm("ลบขั้นของแถมนี้?") && start(() => deleteBonusAction(rule.id))}
                className="btn !p-2.5 text-danger hover:bg-danger/10"
                aria-label="ลบ"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {timed ? (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            เริ่ม (เวลาไทย) — ว่าง = เริ่มเลย
            <input name="startsAt" type="datetime-local" defaultValue={local(rule?.startsAt ?? null)} className="input mt-1" />
          </label>
          <label className="block text-xs text-muted">
            จบ (เวลาไทย) — ว่าง = ไม่มีวันจบ
            <input name="endsAt" type="datetime-local" defaultValue={local(rule?.endsAt ?? null)} className="input mt-1" />
          </label>
        </div>
      ) : null}

      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && !rule && <p className="mt-2 text-sm text-leaf">{state.ok}</p>}
    </form>
  );
}

/** ลองเลื่อนยอดในตะกร้า ดูว่าลูกค้าจะเห็นอะไร */
export function BonusPreview({ tiers }: { tiers: BonusTier[] }) {
  const max = Math.max(100, ...tiers.map((t) => t.minBaht)) * 1.2;
  const [baht, setBaht] = useState(Math.round((tiers[0]?.minBaht ?? 100) * 0.6));
  if (!tiers.length) return <p className="text-sm text-muted">ยังไม่มีของแถมที่เปิดอยู่ — ลูกค้าจะไม่เห็นแถบนี้</p>;
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="flex justify-between text-muted">
          ลองยอดในตะกร้า <b className="text-fg">฿{baht.toLocaleString("th-TH")}</b>
        </span>
        <input type="range" min={0} max={Math.ceil(max)} value={baht} onChange={(e) => setBaht(Number(e.target.value))} className="mt-2 w-full accent-amber-400" />
      </label>
      <div className="max-w-md">
        <BonusBar tiers={tiers} paidBaht={baht} />
      </div>
    </div>
  );
}
