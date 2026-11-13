"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { fetchRobloxProductAction, saveProductAction } from "@/app/actions/admin";

type Initial = {
  id: number;
  passKey: string;
  kind: "pass" | "item";
  robloxProductId: string;
  name: string;
  blurb: string;
  perks: string;
  color: string;
  iconAssetId: string;
  priceRobux: string;
  active: boolean;
  featured: boolean;
  sortOrder: string;
  saleEnd: string;
} | null;

export function ProductForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  const [fetching, startFetch] = useTransition();
  const [fetchMsg, setFetchMsg] = useState("");
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && !initial) router.push("/admin/products");
  }, [state, initial, router]);

  const set = (name: string, v: string) => {
    const el = form.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (el && v) el.value = v;
  };

  return (
    <form ref={form} action={action} className="glass space-y-5 rounded-3xl p-6">
      <input type="hidden" name="id" value={initial?.id ?? 0} />
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Developer Product ID" hint="ID ของผลิตภัณฑ์นักพัฒนาใน Roblox">
          <div className="flex gap-2">
            <input name="robloxProductId" defaultValue={initial?.robloxProductId} required inputMode="numeric" className="input" />
            <button
              type="button"
              disabled={fetching}
              onClick={() =>
                startFetch(async () => {
                  const v = Number((form.current?.elements.namedItem("robloxProductId") as HTMLInputElement).value);
                  const r = await fetchRobloxProductAction(v);
                  if (!r.ok) return setFetchMsg(r.error ?? "ดึงไม่ได้");
                  set("name", r.name ?? "");
                  set("iconAssetId", r.icon ? String(r.icon) : "");
                  setFetchMsg(`ได้ชื่อและไอคอนแล้ว${r.price ? ` • Roblox แจ้งราคา ${r.price} R$ (เช็คว่าเป็นราคาเต็ม)` : ""}`);
                })
              }
              className="btn btn-ghost shrink-0 !px-3 text-sm"
            >
              <Download className="size-4" /> ดึง
            </button>
          </div>
          {fetchMsg && <p className="mt-1 text-xs text-muted">{fetchMsg}</p>}
        </L>
        <L label="รหัสในเกม" hint="พาส: vip, paylord • กล่อง: box_bubble • กาชา: gacha_x10">
          <input name="passKey" defaultValue={initial?.passKey} required pattern="[a-z0-9_]{2,40}" className="input font-mono" />
        </L>
        <L label="ประเภท" hint="พาส = มีได้ชิ้นเดียวต่อคน • ไอเทม = กล่อง บัตร ตั๋ว ซื้อซ้ำได้">
          <select name="kind" defaultValue={initial?.kind ?? "pass"} className="input">
            <option value="pass">พาส</option>
            <option value="item">ไอเทม (ซื้อซ้ำได้)</option>
          </select>
        </L>
        <L label="ชื่อสินค้า">
          <input name="name" defaultValue={initial?.name} required className="input" />
        </L>
        <L label="ราคาเต็ม (Robux)" hint="ราคาปกติ ไม่ใช่ราคาลด Premium">
          <input name="priceRobux" defaultValue={initial?.priceRobux} required inputMode="numeric" className="input" />
        </L>
        <L label="ไอคอน (Asset ID)">
          <input name="iconAssetId" defaultValue={initial?.iconAssetId} inputMode="numeric" className="input" />
        </L>
        <L label="สี">
          <input name="color" type="color" defaultValue={initial?.color ?? "#7c5cff"} className="input h-12 !p-1.5" />
        </L>
        <L label="ลำดับ" hint="น้อย = อยู่ก่อน">
          <input name="sortOrder" defaultValue={initial?.sortOrder ?? "100"} inputMode="numeric" className="input" />
        </L>
        <L label="หมดเวลาขาย (เวลาไทย)" hint="ว่าง = ขายตลอด">
          <input name="saleEnd" type="datetime-local" defaultValue={initial?.saleEnd} className="input" />
        </L>
      </div>
      <L label="คำอธิบายสั้น">
        <input name="blurb" defaultValue={initial?.blurb} className="input" />
      </L>
      <L label="สิทธิ์ที่ได้" hint="บรรทัดละ 1 ข้อ: หัวข้อ | รายละเอียด">
        <textarea name="perks" defaultValue={initial?.perks} rows={8} className="input font-mono text-sm" />
      </L>
      <div className="flex flex-wrap gap-6">
        <Check name="active" label="วางขาย" defaultChecked={initial?.active ?? true} />
        <Check name="featured" label="แสดงเป็นพาสเด่นหน้าแรก" defaultChecked={initial?.featured ?? false} />
      </div>
      {state?.error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-leaf/10 px-3 py-2 text-sm text-leaf">{state.ok}</p>}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
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

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-emerald-400" />
      {label}
    </label>
  );
}
