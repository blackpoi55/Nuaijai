"use client";

import { useActionState, useState } from "react";
import { resolveTopupAction } from "@/app/actions/admin";

export function ResolveForm({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resolveTopupAction, undefined);
  if (state?.ok) return <span className="text-xs text-leaf">{state.ok}</span>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost !px-2.5 !py-1 text-xs">
        เติมให้
      </button>
    );
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input name="amount" required inputMode="decimal" placeholder="บาท" className="input !w-20 !px-2 !py-1 text-xs" />
      <button disabled={pending} className="btn btn-primary !px-2.5 !py-1 text-xs">
        ยืนยัน
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
