"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Gift, Plus, X } from "lucide-react";
import { createGiftCodesAction, deleteUnusedGiftsAction, toggleGiftBatchAction } from "@/app/actions/admin";

type Opt = { id: number; name: string; kind: "pass" | "item"; active: boolean };

export function GiftForm({ products }: { products: Opt[] }) {
  const [state, action, pending] = useActionState(createGiftCodesAction, undefined);
  const [rows, setRows] = useState([{ k: 0, id: products[0]?.id ?? 0 }]);
  const [named, setNamed] = useState(true);
  const [copied, setCopied] = useState(false);
  const kindOf = (id: number) => products.find((p) => p.id === id)?.kind;

  return (
    <form action={action} className="glass space-y-5 rounded-3xl p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <Gift className="size-4 text-leaf" /> สร้างโค้ดแจกของในเกม
      </h2>

      <div>
        <p className="mb-1.5 text-sm font-semibold">ของที่ได้</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.k} className="flex gap-2">
              <select
                name="item"
                value={r.id}
                onChange={(e) => setRows(rows.map((x) => (x.k === r.k ? { ...x, id: Number(e.target.value) } : x)))}
                className="input min-w-0 flex-1"
              >
                <optgroup label="พาส">
                  {products.filter((p) => p.kind === "pass").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.active ? "" : " (ปิดขายอยู่)"}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="กล่อง / ตั๋ว">
                  {products.filter((p) => p.kind === "item").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.active ? "" : " (ปิดขายอยู่)"}
                    </option>
                  ))}
                </optgroup>
              </select>
              {kindOf(r.id) === "pass" ? (
                <input key="one" type="hidden" name="qty" value="1" />
              ) : (
                <input key="qty" name="qty" defaultValue="1" inputMode="numeric" aria-label="จำนวน" className="input !w-20 text-center" />
              )}
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows(rows.filter((x) => x.k !== r.k))} className="btn btn-ghost !p-2.5" aria-label="เอาออก">
                  <X className="size-4" />
                </button>
              )}
              {i === rows.length - 1 && rows.length < 8 && (
                <button
                  type="button"
                  onClick={() => setRows([...rows, { k: Date.now(), id: products[0]?.id ?? 0 }])}
                  className="btn btn-ghost !p-2.5"
                  aria-label="เพิ่มของ"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-dim">กล่อง/ตั๋วใส่จำนวนได้ • ใส่ของหลายอย่างในโค้ดเดียวได้ (กด +) • ของที่ปิดขายอยู่ ต้องมีในเกมแล้ว (Publish) ก่อนแจก</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <L label="เลเวลขั้นต่ำ" hint="0 = ไม่จำกัด">
          <input name="minLevel" defaultValue="0" inputMode="numeric" className="input" />
        </L>
        <L label="เริ่มใช้ได้ (เวลาไทย)" hint="ว่าง = ใช้ได้เลย">
          <input name="startsAt" type="datetime-local" className="input" />
        </L>
        <L label="หมดอายุ (เวลาไทย)" hint="ว่าง = ไม่หมดอายุ">
          <input name="expiresAt" type="datetime-local" className="input" />
        </L>
        <L label="หมายเหตุ" hint="แอดมินเห็นคนเดียว">
          <input name="note" placeholder="เช่น แจกไลฟ์ 30 พ.ย." className="input" />
        </L>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 text-sm sm:max-w-sm">
        <button type="button" onClick={() => setNamed(true)} className={`rounded-lg py-2 font-semibold ${named ? "bg-white/10" : "text-muted"}`}>
          ตั้งชื่อโค้ดเอง
        </button>
        <button type="button" onClick={() => setNamed(false)} className={`rounded-lg py-2 font-semibold ${!named ? "bg-white/10" : "text-muted"}`}>
          สุ่มโค้ดหลายใบ
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {named ? (
          <>
            <L label="ชื่อโค้ด" hint="A-Z 0-9 _ ยาว 3–24 ตัว เช่น LOY2026">
              <input name="custom" required className="input font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} />
            </L>
            <L label="ใช้ได้กี่คน" hint="คนละครั้ง (นับตาม Roblox ID)">
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
        {pending ? "กำลังสร้าง..." : "สร้างโค้ดแจก"}
      </button>
    </form>
  );
}

export function GiftBatchActions({ batch, codes, active, unused }: { batch: string; codes: string[]; active: boolean; unused: number }) {
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
        {copied ? <Check className="size-4 text-leaf" /> : <Copy className="size-4" />} คัดลอก{codes.length > 1 ? `ทั้งชุด (${codes.length})` : "โค้ด"}
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => toggleGiftBatchAction(batch, !active))}
        className={`btn !px-3 !py-1.5 text-xs ${active ? "btn-ghost" : "border-leaf/30 bg-leaf/10 text-leaf"}`}
      >
        {active ? "ปิดโค้ด" : "เปิดโค้ด"}
      </button>
      {unused > 0 && (
        <button
          disabled={pending}
          onClick={() => confirm(`ลบโค้ดที่ยังไม่มีใครใช้ ${unused} โค้ด?`) && start(() => deleteUnusedGiftsAction(batch))}
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
