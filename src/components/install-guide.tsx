"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Download, Laptop, MonitorDown, MoreVertical, PlusSquare, Share, Smartphone, Tablet } from "lucide-react";
import { usePwa } from "./pwa";

type OS = "android" | "ios" | "windows" | "mac";

const TABS: { id: OS; label: string; sub: string; icon: typeof Smartphone }[] = [
  { id: "android", label: "Android", sub: "Chrome / Samsung", icon: Smartphone },
  { id: "ios", label: "iPhone / iPad", sub: "Safari", icon: Tablet },
  { id: "windows", label: "คอม Windows", sub: "Chrome / Edge", icon: MonitorDown },
  { id: "mac", label: "Mac", sub: "Safari / Chrome", icon: Laptop },
];

type Step = { title: React.ReactNode; detail?: React.ReactNode; icon?: React.ReactNode };

function Key({ children }: { children: React.ReactNode }) {
  return <span className="mx-0.5 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-1.5 py-0.5 align-middle text-[0.85em] font-semibold text-fg">{children}</span>;
}

const NOTIFY: Step = {
  title: (
    <>
      เปิดแอปจากไอคอน แล้วกด <Key>🔔</Key> → <b>เปิดแจ้งเตือนบนเครื่องนี้</b>
    </>
  ),
  detail: "จะได้รู้ทันทีตอนแอดมินอนุมัติสลิป หรือมีคนใช้โค้ดที่คุณซื้อ (ต้องล็อกอินก่อน)",
  icon: <BellRing className="size-5 text-gold" />,
};

const GUIDES: Record<OS, { note?: React.ReactNode; steps: Step[]; extra?: { title: string; steps: Step[] } }> = {
  android: {
    steps: [
      { title: <>เปิดเว็บนี้ใน <b>Chrome</b></>, detail: "ถ้าเปิดจากลิงก์ใน LINE / Facebook ให้กด ⋮ แล้วเลือก ‘เปิดใน Chrome’ ก่อน" },
      {
        title: (
          <>
            กดปุ่ม <Key><Download className="size-3.5" /> ติดตั้งเลย</Key> ด้านบน หรือกดเมนู <Key><MoreVertical className="size-3.5" /></Key> มุมขวาบน
          </>
        ),
        detail: <>เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></>,
      },
      { title: <>กด <b>ติดตั้ง</b></>, detail: "ไอคอนเหนื่อยใจจะขึ้นที่หน้าจอโฮมและในลิ้นชักแอป" },
      NOTIFY,
    ],
    extra: {
      title: "ใช้ Samsung Internet",
      steps: [
        { title: <>กดเมนู <Key>≡</Key> แถบล่าง → <b>เพิ่มหน้าไปยัง</b> → <b>หน้าจอหลัก</b></> },
        { title: <>กด <b>เพิ่ม</b> แล้วเปิดจากไอคอน</> },
      ],
    },
  },
  ios: {
    note: (
      <>
        ต้องใช้ <b>Safari</b> และ iOS 16.4 ขึ้นไป • แจ้งเตือนบน iPhone จะทำงาน <b>เฉพาะตอนเปิดจากไอคอนบนหน้าจอโฮม</b>
      </>
    ),
    steps: [
      { title: <>เปิดเว็บนี้ใน <b>Safari</b></>, detail: "ถ้าเปิดจากแอป LINE / Facebook ให้กด ⋯ หรือ ‘แชร์’ แล้วเลือก ‘เปิดใน Safari’" },
      {
        title: (
          <>
            กดปุ่ม <b>แชร์</b> <Key><Share className="size-3.5" /></Key> แถบล่างของ Safari
          </>
        ),
        detail: "บน iPad ปุ่มแชร์อยู่มุมขวาบน",
      },
      {
        title: (
          <>
            เลื่อนลง กด <Key><PlusSquare className="size-3.5" /> เพิ่มไปยังหน้าจอโฮม</Key>
          </>
        ),
        detail: "ถ้าไม่เห็น ให้เลื่อนลงล่างสุดแล้วกด ‘แก้ไขการทำงาน’ เพื่อเพิ่มปุ่มนี้",
      },
      { title: <>กด <b>เพิ่ม</b> มุมขวาบน</>, detail: "ไอคอนเหนื่อยใจจะขึ้นบนหน้าจอโฮม" },
      NOTIFY,
    ],
  },
  windows: {
    steps: [
      { title: <>เปิดเว็บนี้ใน <b>Chrome</b> หรือ <b>Microsoft Edge</b></> },
      {
        title: (
          <>
            กดปุ่ม <Key><Download className="size-3.5" /> ติดตั้งเลย</Key> ด้านบน หรือไอคอน <Key><MonitorDown className="size-3.5" /></Key> ท้ายช่องที่อยู่เว็บ
          </>
        ),
        detail: (
          <>
            ใน Edge: เมนู <Key>⋯</Key> → <b>แอป</b> → <b>ติดตั้งไซต์นี้เป็นแอป</b>
          </>
        ),
      },
      { title: <>กด <b>ติดตั้ง</b></>, detail: "แอปจะเปิดเป็นหน้าต่างของตัวเอง มีไอคอนใน Start menu — คลิกขวาที่ไอคอนบน taskbar แล้ว ‘ปักหมุด’ ได้" },
      { ...NOTIFY, detail: "แจ้งเตือนจะเด้งที่มุมจอ Windows แม้ปิดหน้าต่างแอปไปแล้ว (ถ้าเบราว์เซอร์ยังทำงานอยู่)" },
    ],
  },
  mac: {
    steps: [
      { title: <>Safari (macOS Sonoma ขึ้นไป): เมนู <b>ไฟล์</b> → <b>เพิ่มไปยัง Dock</b></>, detail: "แล้วกด ‘เพิ่ม’ ไอคอนจะอยู่ใน Dock และ Launchpad" },
      {
        title: (
          <>
            หรือใช้ <b>Chrome</b>: กดปุ่ม <Key><Download className="size-3.5" /> ติดตั้งเลย</Key> ด้านบน หรือไอคอน <Key><MonitorDown className="size-3.5" /></Key> ท้ายช่องที่อยู่เว็บ
          </>
        ),
        detail: (
          <>
            หรือเมนู <Key><MoreVertical className="size-3.5" /></Key> → หาเมนูที่มีคำว่า <b>ติดตั้ง</b> (Install)
          </>
        ),
      },
      { title: <>กด <b>ติดตั้ง</b> / <b>เพิ่ม</b></>, detail: "แอปจะเปิดเป็นหน้าต่างแยก ใช้ Cmd + Tab สลับได้เหมือนแอปทั่วไป" },
      { ...NOTIFY, detail: "ถ้าแจ้งเตือนไม่ขึ้น เช็ค ‘การตั้งค่าระบบ → การแจ้งเตือน’ ว่าอนุญาตแอปเหนื่อยใจ / เบราว์เซอร์แล้ว" },
    ],
  },
};

function detect(): OS {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/macintosh|mac os x/i.test(ua)) return "mac";
  return "windows";
}

export function InstallGuide({ initial }: { initial?: OS }) {
  const [os, setOs] = useState<OS>(initial ?? "android");
  const { canInstall, installed, install, isIOS } = usePwa();

  useEffect(() => {
    if (!initial) setOs(detect());
  }, [initial]);

  const g = GUIDES[os];

  return (
    <div>
      {/* สถานะ + ปุ่มติดตั้ง */}
      {installed ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm font-semibold text-leaf">
          <CheckCircle2 className="size-5 shrink-0" /> คุณกำลังใช้แอปที่ติดตั้งแล้ว 🎉 อย่าลืมเปิดแจ้งเตือนที่ 🔔
        </div>
      ) : canInstall && !isIOS ? (
        <button onClick={install} className="btn btn-primary mb-6 w-full !py-4 text-base sm:w-auto sm:!px-8">
          <Download className="size-5" /> ติดตั้งเลย (กดครั้งเดียว)
        </button>
      ) : null}

      {/* แท็บเครื่อง */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setOs(t.id)}
            className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition ${os === t.id ? "border-leaf/40 bg-leaf/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]"}`}
          >
            <t.icon className={`size-6 shrink-0 ${os === t.id ? "text-leaf" : "text-dim"}`} />
            <span>
              <span className={`block text-sm font-bold ${os === t.id ? "text-fg" : "text-muted"}`}>{t.label}</span>
              <span className="block text-[11px] text-dim">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {g.note && <p className="mt-5 rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">{g.note}</p>}

      <ol className="mt-6 space-y-3">
        {g.steps.map((s, i) => (
          <li key={i} className="glass animate-rise flex gap-4 rounded-2xl p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-black text-ink">{s.icon ?? i + 1}</span>
            <div className="min-w-0 pt-1">
              <p className="font-semibold leading-relaxed">{s.title}</p>
              {s.detail && <p className="mt-1 text-sm text-muted">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>

      {g.extra && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-muted">{g.extra.title}</h3>
          <ol className="space-y-2">
            {g.extra.steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="font-bold text-dim">{i + 1}.</span>
                <span>{s.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
