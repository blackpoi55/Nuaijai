"use client";

import { useTransition } from "react";
import { revokeCodeAction } from "@/app/actions/admin";

export function RevokeButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <button
        disabled={pending}
        onClick={() => confirm("ยกเลิกโค้ดนี้ และคืนแต้มให้ผู้ซื้อ?") && start(() => revokeCodeAction(id, true))}
        className="btn btn-ghost !px-2.5 !py-1 text-xs"
      >
        ยกเลิก+คืนแต้ม
      </button>
      <button
        disabled={pending}
        onClick={() => confirm("ยกเลิกโค้ดนี้ โดยไม่คืนแต้ม?") && start(() => revokeCodeAction(id, false))}
        className="btn !px-2.5 !py-1 text-xs text-danger hover:bg-danger/10"
      >
        ยกเลิก
      </button>
    </div>
  );
}
