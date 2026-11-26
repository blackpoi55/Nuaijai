"use client";

import { useState, useTransition } from "react";
import { revokeCodeAction, type AdminState } from "@/app/actions/admin";

// active = โค้ดยังไม่ถูกใช้/ยกเลิก • หลังกดแล้วแถวจะรีเฟรชเป็น "ยกเลิก" แต่ยังโชว์ผลให้แอดมินเห็น
export function RevokeButton({ id, orderId, coupon, active, bonus = false }: { id: number; orderId: number; coupon?: string | null; active: boolean; bonus?: boolean }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<AdminState>();
  const run = (refund: boolean) =>
    start(async () => {
      setRes(await revokeCodeAction(id, refund));
    });
  if (res?.ok) return <span className="chip whitespace-normal border-leaf/30 bg-leaf/10 text-xs text-leaf">{res.ok}</span>;
  if (!active) return res?.error ? <span className="text-xs text-danger">{res.error}</span> : null;
  if (bonus)
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled={pending}
          onClick={() => confirm("ยกเลิกโค้ดของแถมนี้? (ของแถมไม่มีแต้มให้คืน)") && run(false)}
          className="btn !px-2.5 !py-1 text-xs text-danger hover:bg-danger/10"
        >
          {pending ? "กำลังยกเลิก..." : "ยกเลิกของแถม"}
        </button>
        {res?.error && <span className="text-xs text-danger">{res.error}</span>}
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          disabled={pending}
          onClick={() =>
            confirm(
              `ยกเลิกการซื้อ #${orderId} (โค้ดนี้)?\n\n• คืนแต้มให้ผู้ซื้อตามยอดที่จ่ายจริง\n• หักสิทธิ์หมุนวงล้อที่ได้จากยอดนี้\n• ถ้าเป็นโค้ดสุดท้ายของคำสั่งซื้อ โค้ดของแถมที่ยังไม่ใช้จะถูกยกเลิกด้วย` +
                (coupon ? `\n• คืนคูปอง ${coupon} (เมื่อยกเลิกครบทุกโค้ดในคำสั่งซื้อ)` : "") +
                `\n\nโค้ดจะใช้ในเกมไม่ได้อีก`,
            ) && run(true)
          }
          className="btn btn-ghost !px-2.5 !py-1 text-xs"
        >
          {pending ? "กำลังยกเลิก..." : "ยกเลิก+คืนแต้ม"}
        </button>
        <button
          disabled={pending}
          onClick={() => confirm("ยกเลิกโค้ดนี้ โดยไม่คืนแต้ม?") && run(false)}
          className="btn !px-2.5 !py-1 text-xs text-danger hover:bg-danger/10"
        >
          ยกเลิก
        </button>
      </div>
      {res?.error && <span className="text-xs text-danger">{res.error}</span>}
    </div>
  );
}
