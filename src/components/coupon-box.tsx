"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, TicketPercent, XCircle } from "lucide-react";
import { redeemPointsCouponAction } from "@/app/actions/coupon";

// ช่องกรอกคูปองแต้มฟรีที่แอดมินแจก
export function CouponBox() {
  const [state, action, pending] = useActionState(redeemPointsCouponAction, undefined);
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (ref.current) ref.current.value = "";
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="glass animate-rise rounded-[2rem] p-6" style={{ animationDelay: "40ms" }}>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <TicketPercent className="size-5 text-grape" /> กรอกคูปอง
      </h2>
      <p className="mt-1 text-xs text-dim">คูปองส่วนลด กรอกในตะกร้า</p>
      <form action={action} className="mt-4 flex gap-2">
        <input
          ref={ref}
          name="coupon"
          required
          autoComplete="off"
          placeholder="เช่น OPEN50"
          onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
          className="input !py-3 font-mono uppercase tracking-wider"
        />
        <button disabled={pending} className="btn btn-primary shrink-0">
          {pending ? "..." : "ใช้คูปอง"}
        </button>
      </form>
      {state && (
        <p key={state.message} className={`animate-pop mt-3 flex items-start gap-2 text-sm font-semibold ${state.ok ? "text-leaf" : "text-danger"}`}>
          {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      )}
    </section>
  );
}
