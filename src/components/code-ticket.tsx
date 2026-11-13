import { CheckCircle2, Gamepad2, Ticket, XCircle } from "lucide-react";
import type { Code } from "@/db/schema";
import { prettyCode } from "@/lib/codes";
import { CopyButton } from "./ui";

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export function HowTo() {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
      <Gamepad2 className="size-5 shrink-0 text-grape" />
      <span className="text-muted">
        ในเกม: เปิด <b className="text-fg">มือถือ</b> → แอป <b className="text-fg">โค้ด</b> → กรอกโค้ด → <b className="text-fg">รับของ</b>
      </span>
    </div>
  );
}

export function CodeTicket({ c, colors }: { c: Code; colors: Record<string, string> }) {
  const pretty = prettyCode(c.code);
  const color = colors[c.passKeys[0]] ?? "#34d399";
  const used = c.status === "used";
  const revoked = c.status === "revoked";
  return (
    <div
      className={`relative flex overflow-hidden rounded-2xl border border-line ${used || revoked ? "opacity-60" : ""}`}
      style={{ background: `linear-gradient(110deg, ${color}26, rgba(255,255,255,0.03) 45%)` }}
    >
      <div className="w-1.5 shrink-0" style={{ background: color }} />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Ticket className="size-3.5" /> {c.label}
          </p>
          <p className={`mt-1 font-mono text-xl font-bold tracking-[0.18em] sm:text-2xl ${used || revoked ? "line-through decoration-2" : ""}`}>{pretty}</p>
          {used && (
            <p className="mt-1 flex items-center gap-1 text-xs text-leaf">
              <CheckCircle2 className="size-3.5" /> ใช้แล้ว {c.usedAt ? fmt.format(c.usedAt) : ""} · Roblox ID {c.usedByRobloxId}
            </p>
          )}
          {revoked && (
            <p className="mt-1 flex items-center gap-1 text-xs text-danger">
              <XCircle className="size-3.5" /> ยกเลิกแล้ว
            </p>
          )}
        </div>
        {c.status === "active" && <CopyButton text={pretty} />}
      </div>
      {/* รอยปรุ */}
      <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-ink" />
    </div>
  );
}
