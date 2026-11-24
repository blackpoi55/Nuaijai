"use client";

import { useTransition } from "react";
import { toggleProductAction } from "@/app/actions/admin";

export function ToggleActive({ id, active, onSale, upcoming = false }: { id: number; active: boolean; onSale: boolean; upcoming?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => toggleProductAction(id, !active))}
      className={`chip cursor-pointer ${onSale ? "border-leaf/30 bg-leaf/10 text-leaf" : active ? "text-gold" : "text-dim"}`}
      title="กดเพื่อเปิด/ปิดการขาย"
    >
      <span className={`size-1.5 rounded-full ${onSale ? "bg-leaf" : active ? "bg-gold" : "bg-dim"}`} />
      {onSale ? "วางขาย" : upcoming ? "รอเปิดขาย" : active ? "หมดเวลาขาย" : "ปิดขาย"}
    </button>
  );
}
