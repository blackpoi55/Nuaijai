import { BellRing, Smartphone, Zap } from "lucide-react";
import { InstallGuide } from "@/components/install-guide";

export const metadata = { title: "ติดตั้งแอป" };

type OS = "android" | "ios" | "windows" | "mac";

export default async function InstallPage({ searchParams }: { searchParams: Promise<{ os?: string }> }) {
  const { os } = await searchParams;
  const initial = (["android", "ios", "windows", "mac"] as const).includes(os as OS) ? (os as OS) : undefined;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/192.png" alt="" className="size-20 shrink-0 rounded-[1.4rem] shadow-xl shadow-amber-500/20 ring-1 ring-white/15" />
        <div>
          <h1 className="text-3xl font-black">ติดตั้งแอปเหนื่อยใจ</h1>
          <p className="mt-1 text-muted">ใช้เหมือนแอปจริง เปิดเร็ว เต็มจอ และรับแจ้งเตือนได้ — ไม่ต้องโหลดจาก Store</p>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Smartphone, t: "ไอคอนบนหน้าจอ", d: "กดเปิดได้ทันที ไม่ต้องพิมพ์เว็บ" },
          { icon: BellRing, t: "แจ้งเตือนเด้ง", d: "รู้ทันทีเมื่อสลิปอนุมัติหรือโค้ดถูกใช้" },
          { icon: Zap, t: "ฟรี ไม่กินเครื่อง", d: "ไม่ต้องโหลดจาก Play Store / App Store" },
        ].map((x) => (
          <div key={x.t} className="glass rounded-2xl p-4">
            <x.icon className="size-5 text-leaf" />
            <p className="mt-2 font-bold">{x.t}</p>
            <p className="text-sm text-muted">{x.d}</p>
          </div>
        ))}
      </div>

      <InstallGuide initial={initial} />
    </div>
  );
}
