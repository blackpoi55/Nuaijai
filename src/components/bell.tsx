"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { markNotificationsReadAction, removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notify";
import { usePwa } from "./pwa";

type Item = { id: number; title: string; body: string; url: string; readAt: string | null; createdAt: string };
type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "เมื่อกี้";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

export function NotificationBell({ initialUnread, vapidKey }: { initialUnread: number; vapidKey: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [push, setPush] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const { registration, isIOS, installed } = usePwa();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const lastUnread = useRef(initialUnread);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { unread: number; items: Item[] };
      setUnread(j.unread);
      setItems(j.items);
      // มีแจ้งเตือนใหม่ = แต้ม/สถานะอาจเปลี่ยน ให้หน้าเว็บโหลดข้อมูลใหม่
      if (j.unread > lastUnread.current) router.refresh();
      lastUnread.current = j.unread;
    } catch {}
  }, [router]);

  // เช็คทุก 30 วิ ตอนเปิดหน้าอยู่ + ทันทีที่มี push เข้า
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && load();
    const t = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    const onMsg = (e: MessageEvent) => e.data?.type === "nh-notify" && load();
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      navigator.serviceWorker?.removeEventListener("message", onMsg);
    };
  }, [load]);

  // สถานะแจ้งเตือนบนเครื่องนี้
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPush(isIOS && !installed ? "needs-install" : "unsupported");
      return;
    }
    if (!vapidKey) return setPush("unsupported");
    if (Notification.permission === "denied") return setPush("denied");
    if (!registration) return;
    registration.pushManager
      .getSubscription()
      .then((s) => setPush(s && Notification.permission === "granted" ? "on" : "off"))
      .catch(() => setPush("off"));
  }, [registration, vapidKey, isIOS, installed]);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        await markNotificationsReadAction().catch(() => {});
        setUnread(0);
        lastUnread.current = 0;
      }
    }
  };

  const enablePush = async () => {
    if (!registration) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setPush(perm === "denied" ? "denied" : "off");
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapidKey) }));
      const r = await savePushSubscriptionAction(sub.toJSON(), navigator.userAgent);
      setPush(r.ok ? "on" : "off");
    } catch {
      setPush("off");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    if (!registration) return;
    setBusy(true);
    try {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setPush("off");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggleOpen} className="btn btn-ghost relative !px-3" aria-label="การแจ้งเตือน">
        {unread > 0 ? <BellRing className="size-5 text-gold" /> : <Bell className="size-5" />}
        {unread > 0 && (
          <span key={unread} className="animate-pop absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="animate-rise fixed inset-x-3 top-[4.5rem] z-[70] overflow-hidden rounded-2xl border border-line bg-ink-2/[0.97] shadow-2xl shadow-black/60 backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96"
          style={{ animationDuration: ".2s" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">การแจ้งเตือน</p>
          </div>

          {/* เปิด/ปิดแจ้งเตือนบนเครื่องนี้ */}
          <div className="border-b border-line bg-black/20 px-4 py-3 text-sm">
            {push === "loading" && <p className="text-dim">กำลังเช็ค...</p>}
            {push === "on" && (
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-leaf">
                  <BellRing className="size-4" /> เครื่องนี้รับแจ้งเตือนอยู่
                </p>
                <button disabled={busy} onClick={disablePush} className="text-xs text-muted underline-offset-2 hover:underline">
                  ปิด
                </button>
              </div>
            )}
            {push === "off" && (
              <button disabled={busy} onClick={enablePush} className="btn btn-primary w-full !py-2 text-sm">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} เปิดแจ้งเตือนบนเครื่องนี้
              </button>
            )}
            {push === "denied" && (
              <p className="flex items-start gap-2 text-muted">
                <BellOff className="mt-0.5 size-4 shrink-0" /> เบราว์เซอร์บล็อกการแจ้งเตือนไว้ ไปเปิดที่การตั้งค่าเว็บไซต์ (รูปแม่กุญแจข้างที่อยู่เว็บ)
              </p>
            )}
            {push === "needs-install" && <p className="text-muted">บน iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน (Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม) แล้วเปิดจากไอคอนแอป</p>}
            {push === "unsupported" && <p className="text-muted">เครื่องนี้แสดงแจ้งเตือนเด้งไม่ได้ แต่ดูได้ที่กระดิ่งนี้</p>}
          </div>

          <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
            {items === null && <p className="p-6 text-center text-sm text-dim">กำลังโหลด...</p>}
            {items?.length === 0 && <p className="p-6 text-center text-sm text-muted">ยังไม่มีการแจ้งเตือน</p>}
            {items?.map((n) => (
              <Link
                key={n.id}
                href={n.url}
                onClick={() => setOpen(false)}
                className={`block border-b border-line px-4 py-3 last:border-0 hover:bg-white/5 ${n.readAt ? "" : "bg-sky-400/[0.06]"}`}
              >
                <p className="flex items-start justify-between gap-3 text-sm font-semibold">
                  <span>{n.title}</span>
                  {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-400" />}
                </p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>}
                <p className="mt-1 text-[11px] text-dim">{ago(n.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
