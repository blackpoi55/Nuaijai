"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { approveSlipAction, rejectSlipAction } from "@/app/actions/admin";

export function SlipActions({ id, amount }: { id: number; amount: number }) {
  const [okState, approve, approving] = useActionState(approveSlipAction, undefined);
  const [noState, reject, rejecting] = useActionState(rejectSlipAction, undefined);
  const [rejectOpen, setRejectOpen] = useState(false);
  const done = okState?.ok ?? noState?.ok;
  if (done) return <p className="pt-2 text-sm font-semibold text-leaf">{done}</p>;

  return (
    <div className="space-y-2 pt-2">
      <form action={approve} className="flex gap-1.5">
        <input type="hidden" name="id" value={id} />
        <input name="amount" defaultValue={amount} inputMode="decimal" className="input !w-24 !px-2.5 !py-1.5 text-sm" aria-label="ยอดที่ได้รับจริง" />
        <button disabled={approving} className="btn btn-primary !px-3 !py-1.5 text-sm">
          <Check className="size-4" /> อนุมัติ
        </button>
      </form>
      {!rejectOpen ? (
        <button onClick={() => setRejectOpen(true)} className="btn !px-3 !py-1.5 text-sm text-danger hover:bg-danger/10">
          <X className="size-4" /> ปฏิเสธ
        </button>
      ) : (
        <form action={reject} className="flex gap-1.5">
          <input type="hidden" name="id" value={id} />
          <input name="note" placeholder="เหตุผล (ผู้ใช้เห็น)" className="input !px-2.5 !py-1.5 text-sm" />
          <button disabled={rejecting} className="btn !px-3 !py-1.5 text-sm text-danger hover:bg-danger/10">
            ยืนยัน
          </button>
        </form>
      )}
      {(okState?.error || noState?.error) && <p className="text-xs text-danger">{okState?.error ?? noState?.error}</p>}
    </div>
  );
}
