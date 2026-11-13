"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function PassIcon({ src, name, color, className = "" }: { src: string | null; name: string; color: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 30% 20%, ${color}55, ${color}15 60%, transparent)` }}
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-2xl font-black" style={{ color }}>
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "คัดลอก", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={`btn btn-ghost !px-3 !py-2 text-sm ${className}`}
    >
      {done ? <Check className="size-4 text-leaf" /> : <Copy className="size-4" />}
      {done ? "คัดลอกแล้ว" : label}
    </button>
  );
}
