import { CheckCircle2, Clock, ExternalLink, Gamepad2, Ticket, XCircle } from "lucide-react";
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
      className="relative flex overflow-hidden rounded-2xl border border-line"
      style={{ background: `linear-gradient(110deg, ${color}${used || revoked ? "14" : "26"}, rgba(255,255,255,0.03) 45%)` }}
    >
      <div className={`w-1.5 shrink-0 ${used || revoked ? "opacity-40" : ""}`} style={{ background: color }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
              <Ticket className="size-3.5" /> {c.label}
            </p>
            <p className={`mt-1 font-mono text-xl font-bold tracking-[0.18em] sm:text-2xl ${used || revoked ? "text-muted line-through decoration-2" : ""}`}>{pretty}</p>
          </div>
          <div className="flex items-center gap-2">
            {c.status === "active" && (
              <span className="chip border-aqua/30 bg-aqua/10 text-aqua">
                <Clock className="size-3.5" /> ยังไม่ได้ใช้
              </span>
            )}
            {used && (
              <span className="chip border-leaf/30 bg-leaf/10 text-leaf">
                <CheckCircle2 className="size-3.5" /> ใช้แล้ว
              </span>
            )}
            {revoked && (
              <span className="chip border-danger/30 bg-danger/10 text-danger">
                <XCircle className="size-3.5" /> ยกเลิกแล้ว
              </span>
            )}
            {c.status === "active" && <CopyButton text={pretty} />}
          </div>
        </div>

        {used && c.usedByRobloxId && (
          <a
            href={`https://www.roblox.com/users/${c.usedByRobloxId}/profile`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2.5 transition hover:bg-black/35"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/20 text-sm font-bold text-leaf">
              {(c.usedByDisplayName || c.usedByName || "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-semibold">
                ใช้โดย {c.usedByDisplayName || c.usedByName || "ผู้เล่น Roblox"}
                {c.usedByName && <span className="font-normal text-muted"> @{c.usedByName}</span>}
              </span>
              <span className="block text-xs text-dim">
                Roblox ID {c.usedByRobloxId}
                {c.usedAt ? ` • ${fmt.format(c.usedAt)}` : ""}
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-dim" />
          </a>
        )}
      </div>
      {/* รอยปรุ */}
      <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-ink" />
    </div>
  );
}
