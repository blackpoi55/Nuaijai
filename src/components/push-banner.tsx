"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Note = { title: string; body: string; url: string; important: boolean; action?: string };

// แจ้งเตือนเข้าตอนเปิดแอปอยู่: แบนเนอร์ใหญ่ด้านบนจอ (service worker ส่ง "nh-notify" + show มาให้)
export function PushBanner() {
  const [note, setNote] = useState<Note | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "nh-notify" || !e.data.show || !e.data.note) return;
      setNote(e.data.note);
      setKey((k) => k + 1);
      if (e.data.note.important && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);

  // ปกติหายเองใน 8 วิ • แจ้งเตือนสำคัญ (ของแอดมิน) ค้างจนกว่าจะกด
  useEffect(() => {
    if (!note || note.important) return;
    const t = setTimeout(() => setNote(null), 8000);
    return () => clearTimeout(t);
  }, [note, key]);

  if (!note) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        key={key}
        role="alert"
        className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.6rem] border border-gold/40 bg-ink-2/95 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(226_194_125/0.15)] backdrop-blur-xl [animation:nh-drop_.45s_cubic-bezier(.2,.9,.3,1.2)_both]"
      >
        <div className="gold-rule" />
        <div className="flex gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/192.png" alt="" className="size-14 shrink-0 rounded-2xl ring-1 ring-gold/30" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold leading-snug">{note.title}</p>
            {note.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{note.body}</p>}
            <div className="mt-3 flex gap-2">
              <Link href={note.url} onClick={() => setNote(null)} className="btn btn-primary !px-5 !py-2 text-sm">
                {note.action || "เปิดดู"}
              </Link>
              <button onClick={() => setNote(null)} className="btn btn-ghost !px-4 !py-2 text-sm">
                ปิด
              </button>
            </div>
          </div>
          <button onClick={() => setNote(null)} className="-mr-1 -mt-1 self-start p-1 text-dim hover:text-fg" aria-label="ปิด">
            <X className="size-4" />
          </button>
        </div>
        {!note.important && <div className="h-0.5 origin-left bg-gold/60 [animation:nh-shrink_8s_linear_both]" />}
      </div>
      <style>{`@keyframes nh-drop{from{transform:translateY(-120%);opacity:0}to{transform:none;opacity:1}}@keyframes nh-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  );
}
