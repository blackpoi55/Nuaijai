"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notify";

// ลงทะเบียน service worker + ปุ่มติดตั้งแอป (Chrome/Edge ใช้ prompt ของเบราว์เซอร์, เครื่องอื่นพาไปหน้า /install)

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Pwa = { canInstall: boolean; installed: boolean; isIOS: boolean; install: () => void; registration: ServiceWorkerRegistration | null };

const Ctx = createContext<Pwa>({ canInstall: false, installed: false, isIOS: false, install: () => {}, registration: null });
export const usePwa = () => useContext(Ctx);

export function PwaProvider({ children, userId }: { children: React.ReactNode; userId: number | null }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const router = useRouter();

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

  // กดครั้งเดียวติดตั้งได้ (Chrome/Edge บน Android และคอม) — ที่เหลือพาไปหน้าวิธีติดตั้ง
  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else {
      router.push(isIOS ? "/install?os=ios" : "/install");
    }
  }, [deferred, isIOS, router]);

  const canInstall = !installed && !!deferred;

  return <Ctx.Provider value={{ canInstall, installed, isIOS, install, registration }}>{children}</Ctx.Provider>;
}

export function InstallButton({ className = "" }: { className?: string }) {
  const { installed, install } = usePwa();
  if (installed) return null;
  return (
    <button onClick={install} className={`btn btn-ghost !px-3 !py-2 text-sm ${className}`} title="ติดตั้งแอป">
      <Download className="size-4 text-leaf" />
      <span className="hidden xl:inline">ติดตั้งแอป</span>
    </button>
  );
}
