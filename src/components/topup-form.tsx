"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, ClipboardPaste, Gift, Loader2, XCircle } from "lucide-react";
import { topupAction } from "@/app/actions/shop";
import { formatBaht } from "@/lib/pricing";

export function TopupForm() {
  const [state, action, pending] = useActionState(topupAction, undefined);
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      if (ref.current) ref.current.value = "";
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="relative">
        <Gift className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-rose" />
        <input
          ref={ref}
          name="voucher"
          required
          autoComplete="off"
          placeholder="https://gift.truemoney.com/campaign/?v=..."
          className="input !py-4 !pl-12 !pr-28 text-base"
        />
        <button
          type="button"
          onClick={async () => {
            try {
              const t = await navigator.clipboard.readText();
              if (ref.current) ref.current.value = t.trim();
            } catch {}
          }}
          className="btn btn-ghost absolute right-2 top-1/2 -translate-y-1/2 !px-3 !py-2 text-sm"
        >
          <ClipboardPaste className="size-4" /> วาง
        </button>
      </div>
      <button disabled={pending} className="btn btn-primary w-full !py-4 text-base">
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" /> กำลังตรวจซอง...
          </>
        ) : (
          <>
            <Gift className="size-5" /> รับซอง เติมแต้มเลย
          </>
        )}
      </button>

      {state && (
        <div
          key={JSON.stringify(state)}
          className={`animate-pop flex items-start gap-3 rounded-2xl border p-4 ${state.ok ? "border-leaf/30 bg-leaf/10" : "border-danger/30 bg-danger/10"}`}
        >
          {state.ok ? <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-leaf" /> : <XCircle className="mt-0.5 size-6 shrink-0 text-danger" />}
          <div>
            <p className={`font-bold ${state.ok ? "text-leaf" : "text-danger"}`}>{state.message}</p>
            {state.ok && <p className="text-sm text-muted">แต้มคงเหลือ {formatBaht(state.balance)} แต้ม</p>}
          </div>
        </div>
      )}
    </form>
  );
}
