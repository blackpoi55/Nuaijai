"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notify";

// ลงทะเบียน service worker + ปุ่มติดตั้งแอป (Android/คอมใช้ prompt ของเบราว์เซอร์, iPhone แสดงวิธีเพิ่มลงหน้าจอโฮม)

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Pwa = { canInstall: boolean; installed: boolean; isIOS: boolean; install: () => void; registration: ServiceWorkerRegistration | null };

const Ctx = createContext<Pwa>({ canInstall: false, installed: false, isIOS: false, install: () => {}, registration: null });
export const usePwa = () => useContext(Ctx);

export function PwaProvider({ children, userId }: { children: React.ReactNode; userId: number | null }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(setRegistration)
        .catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // เครื่องนี้รับแจ้งเตือนของ "คนที่ล็อกอินอยู่ตอนนี้" เท่านั้น:
  // ไม่ได้ล็อกอิน = ยกเลิกรับ • ล็อกอินอยู่ = ผูก endpoint กับบัญชีนี้ (ย้ายจากบัญชีเก่าถ้าเคยใช้เครื่องร่วม)
  useEffect(() => {
    if (!registration || !("pushManager" in registration)) return;
    registration.pushManager
      .getSubscription()
      .then(async (sub) => {
        if (!sub) return;
        if (userId === null) {
          await removePushSubscriptionAction(sub.endpoint).catch(() => {});
          await sub.unsubscribe().catch(() => {});
        } else if (Notification.permission === "granted") {
          await savePushSubscriptionAction(sub.toJSON(), navigator.userAgent).catch(() => {});
        }
      })
      .catch(() => {});
  }, [registration, userId]);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else if (isIOS) setIosHelp(true);
  }, [deferred, isIOS]);

  const canInstall = !installed && (!!deferred || isIOS);

  return (
    <Ctx.Provider value={{ canInstall, installed, isIOS, install, registration }}>
      {children}
      {iosHelp && (
        <div className="fixed inset-0 z-[90] grid place-items-end p-3 sm:place-items-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIosHelp(false)} />
          <div className="glass animate-rise relative w-full max-w-sm rounded-3xl p-6">
            <button onClick={() => setIosHelp(false)} className="btn btn-ghost absolute right-3 top-3 !p-2" aria-label="ปิด">
              <X className="size-4" />
            </button>
            <h3 className="text-lg font-bold">ติดตั้งแอปบน iPhone / iPad</h3>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Share className="size-5 text-sky-300" />
                </span>
                เปิดเว็บนี้ใน Safari แล้วกดปุ่ม <b>แชร์</b> ด้านล่าง
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <PlusSquare className="size-5 text-leaf" />
                </span>
                เลือก <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วกด <b>เพิ่ม</b>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">🔔</span>
                เปิดแอปจากหน้าจอโฮม แล้วกดกระดิ่งเพื่อเปิดแจ้งเตือน
              </li>
            </ol>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, install } = usePwa();
  if (!canInstall) return null;
  return (
    <button onClick={install} className={`btn btn-ghost !px-3 !py-2 text-sm ${className}`} title="ติดตั้งแอป">
      <Download className="size-4 text-leaf" />
      <span className="hidden lg:inline">ติดตั้งแอป</span>
    </button>
  );
}
