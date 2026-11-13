"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User, UserPlus } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";

export function AuthForm({ kind, next }: { kind: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState(kind === "login" ? loginAction : registerAction, undefined);
  const [show, setShow] = useState(false);
  const reg = kind === "register";

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-10rem)] max-w-md place-items-center px-4 py-10">
      <div className="glass animate-rise w-full rounded-[2rem] p-7 shadow-2xl sm:p-9">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-gold/40 bg-gold/10">
          {reg ? <UserPlus className="size-6 text-gold" strokeWidth={1.5} /> : <LogIn className="size-6 text-gold" strokeWidth={1.5} />}
        </div>
        <h1 className="text-center text-3xl font-semibold">{reg ? "สมัครสมาชิก" : "ยินดีต้อนรับกลับ"}</h1>
        <p className="mt-1 text-center text-sm text-muted">{reg ? "สมัครฟรี ใช้แค่ชื่อผู้ใช้กับรหัสผ่าน" : "เข้าสู่ระบบเพื่อเติมแต้มและซื้อพาส"}</p>

        <form action={action} className="mt-7 space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field icon={User}>
            <input name="username" required autoComplete="username" placeholder="ชื่อผู้ใช้" className="input !pl-11" maxLength={20} />
          </Field>
          <Field icon={Lock}>
            <input
              name="password"
              required
              type={show ? "text" : "password"}
              autoComplete={reg ? "new-password" : "current-password"}
              placeholder="รหัสผ่าน"
              className="input !pl-11 !pr-11"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-fg" aria-label="แสดงรหัสผ่าน">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </Field>
          {reg && (
            <Field icon={Lock}>
              <input name="confirm" required type={show ? "text" : "password"} autoComplete="new-password" placeholder="ยืนยันรหัสผ่าน" className="input !pl-11" />
            </Field>
          )}
          {reg && <p className="text-xs text-dim">ชื่อผู้ใช้ใช้ a-z, 0-9, _ ได้ 3–20 ตัว • รหัสผ่านอย่างน้อย 6 ตัว • จำรหัสไว้ให้ดี ถ้าลืมต้องติดต่อแอดมิน</p>}
          {state?.error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</div>}
          <button disabled={pending} className="btn btn-primary w-full !py-3.5 text-base">
            {pending ? "กำลังดำเนินการ..." : reg ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {reg ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
          <Link href={`${reg ? "/login" : "/register"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-gold hover:underline">
            {reg ? "เข้าสู่ระบบ" : "สมัครเลย"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
      {children}
    </div>
  );
}
