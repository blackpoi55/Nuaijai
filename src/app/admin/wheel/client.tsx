"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { saveSettingsPartialAction } from "@/app/actions/admin";
import { deletePrizeAction, grantSpinsAction, savePrizeAction } from "@/app/actions/wheel";
import type { WheelPrize } from "@/db/schema";

type Item = { passKey: string; name: string };

const KIND_LABEL: Record<string, string> = { points: "แต้ม", coupon: "คูปองส่วนลด", item: "ไอเทมในเกม", none: "เกือบได้" };

function describe(p: WheelPrize, items: Item[]) {
  if (p.kind === "points") return `+${p.value / 100} แต้ม`;
  if (p.kind === "coupon") return p.couponType === "baht" ? `ลด ฿${p.value}` : `ลด ${p.value}%`;
  if (p.kind === "item") return `${items.find((i) => i.passKey === p.passKey)?.name ?? p.passKey ?? "-"}${p.value > 1 ? ` ×${p.value}` : ""}`;
  return "ไม่ได้รางวัล";
}

export function PrizeRow({ prize, chance, items }: { prize: WheelPrize; chance: number; items: Item[] }) {
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();
  if (edit) return <PrizeForm items={items} prize={prize} onDone={() => setEdit(false)} />;
  return (
    <div className={`glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 ${prize.active ? "" : "opacity-50"}`}>
      <span className="size-4 shrink-0 rounded-full ring-1 ring-white/20" style={{ background: prize.color }} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{prize.label}</p>
        <p className="text-xs text-dim">
          {KIND_LABEL[prize.kind]} · {describe(prize, items)} · น้ำหนัก {prize.weight}
          {prize.stock !== null && ` · เหลือ ${prize.stock}`}
        </p>
      </div>
      <span className="font-display text-lg text-gold tabular-nums">{chance ? `${chance < 1 ? chance.toFixed(1) : Math.round(chance)}%` : "ไม่ออก"}</span>
      <div className="flex gap-1">
        <button onClick={() => setEdit(true)} className="btn btn-ghost !p-2" aria-label="แก้ไข">
          <Pencil className="size-4" />
        </button>
        <button
          disabled={pending}
          onClick={() => confirm(`ลบรางวัล "${prize.label}"?`) && start(() => deletePrizeAction(prize.id))}
          className="btn !p-2 text-danger hover:bg-danger/10"
          aria-label="ลบ"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PrizeForm({ items, prize, onDone }: { items: Item[]; prize?: WheelPrize; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof savePrizeAction>[0], f: FormData) => {
    const r = await savePrizeAction(prev, f);
    if (r?.ok && onDone) onDone();
    return r;
  }, undefined);
  const [open, setOpen] = useState(!!prize);
  const [kind, setKind] = useState<string>(prize?.kind ?? "points");
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost">
        <Plus className="size-4" /> เพิ่มรางวัล
      </button>
    );
  const value = prize ? (prize.kind === "points" ? prize.value / 100 : prize.value) : "";
  return (
    <form action={action} className="glass space-y-4 rounded-2xl p-5">
      <input type="hidden" name="id" value={prize?.id ?? 0} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L label="ชื่อบนวงล้อ" hint="สั้นๆ ไม่เกิน 12 ตัวจะสวยสุด">
          <input name="label" defaultValue={prize?.label} required maxLength={24} className="input" />
        </L>
        <L label="ประเภท">
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input">
            <option value="points">แต้ม</option>
            <option value="coupon">คูปองส่วนลด</option>
            <option value="item">ไอเทมในเกม</option>
            <option value="none">เกือบได้</option>
          </select>
        </L>
        {kind === "points" && (
          <L label="จำนวนแต้ม">
            <input name="value" defaultValue={value} inputMode="decimal" className="input" />
          </L>
        )}
        {kind === "coupon" && (
          <L label="ส่วนลด">
            <div className="flex gap-2">
              <input name="value" defaultValue={value} inputMode="numeric" className="input" />
              <select name="couponType" defaultValue={prize?.couponType ?? "percent"} className="input !w-24">
                <option value="percent">%</option>
                <option value="baht">บาท</option>
              </select>
            </div>
          </L>
        )}
        {kind === "item" && (
          <>
            <L label="ไอเทม">
              <select name="passKey" defaultValue={prize?.passKey ?? ""} className="input">
                {items.map((i) => (
                  <option key={i.passKey} value={i.passKey}>
                    {i.name}
                  </option>
                ))}
              </select>
            </L>
            <L label="จำนวนชิ้น" hint="ได้หลายชิ้นในโค้ดเดียว">
              <input name="value" defaultValue={prize?.kind === "item" ? Math.max(1, prize.value) : 1} inputMode="numeric" className="input" />
            </L>
          </>
        )}
        <L label="น้ำหนัก (โอกาส)" hint="ยิ่งมากยิ่งออกบ่อย">
          <input name="weight" defaultValue={prize?.weight ?? 10} inputMode="numeric" className="input" />
        </L>
        <L label="จำนวนที่มี" hint="ว่าง = ไม่จำกัด">
          <input name="stock" defaultValue={prize?.stock ?? ""} inputMode="numeric" className="input" />
        </L>
        <L label="สีช่อง">
          <input name="color" type="color" defaultValue={prize?.color ?? "#e2c27d"} className="input h-12 !p-1.5" />
        </L>
        <L label="ลำดับบนวง">
          <input name="sortOrder" defaultValue={prize?.sortOrder ?? 0} inputMode="numeric" className="input" />
        </L>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={prize?.active ?? true} className="size-4 accent-amber-300" /> แสดงบนวงล้อ
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && !prize && <p className="text-sm text-leaf">{state.ok}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="btn btn-primary !py-2 text-sm">
          บันทึก
        </button>
        <button type="button" onClick={() => (onDone ? onDone() : setOpen(false))} className="btn btn-ghost !py-2 text-sm">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

export function GrantForm() {
  const [state, action, pending] = useActionState(grantSpinsAction, undefined);
  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">ให้สิทธิ์หมุน</h3>
      <div className="flex gap-2">
        <input name="username" required placeholder="ชื่อผู้ใช้" className="input" />
        <input name="spins" required inputMode="numeric" placeholder="+1" className="input !w-24" />
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-leaf" : "text-danger"}`}>{state.ok ?? state.error}</p>}
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">
        ให้สิทธิ์
      </button>
    </form>
  );
}

export function WheelSettings({ open, bahtPerSpin }: { open: boolean; bahtPerSpin: number }) {
  const [state, action, pending] = useActionState(saveSettingsPartialAction, undefined);
  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">ตั้งค่าวงล้อ</h3>
      <input type="hidden" name="_keys" value="wheelOpen,bahtPerSpin" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="wheelOpen" defaultChecked={open} className="size-4 accent-amber-300" /> เปิดวงล้อ (ปิด = ซ่อนหน้า และซื้อแล้วไม่ได้สิทธิ์)
      </label>
      <L label="ซื้อสะสมกี่บาท ได้ 1 สิทธิ์">
        <input name="bahtPerSpin" defaultValue={bahtPerSpin} inputMode="numeric" className="input max-w-40" />
      </L>
      {state && <p className={`text-sm ${state.ok ? "text-leaf" : "text-danger"}`}>{state.ok ?? state.error}</p>}
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">
        บันทึก
      </button>
    </form>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </label>
  );
}
