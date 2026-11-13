import { getSettings } from "@/lib/settings";
import { PageTitle } from "../ui";
import { SettingsForm } from "./form";

export default async function AdminSettings() {
  const st = await getSettings();
  const phone = (process.env.TRUEMONEY_PHONE ?? "").replace(/\D/g, "");
  return (
    <div className="max-w-2xl">
      <PageTitle title="ตั้งค่าร้าน" />
      <SettingsForm initial={st} />
      <div className="glass mt-6 space-y-2 rounded-2xl p-5 text-sm">
        <h3 className="font-bold">ค่าที่ตั้งในเซิร์ฟเวอร์ (ไฟล์ .env / Vercel)</h3>
        <p className="text-muted">
          เบอร์รับซอง: <b className="text-fg">{phone ? `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}` : "ยังไม่ได้ตั้ง"}</b>
        </p>
        <p className="text-muted">
          รหัสเชื่อมเกม (GAME_API_KEY): <b className="text-fg">{(process.env.GAME_API_KEY ?? "").length >= 16 ? "ตั้งแล้ว" : "ยังไม่ได้ตั้ง"}</b>
        </p>
        <p className="text-muted">
          โหมดทดสอบซอง: <b className={process.env.TRUEMONEY_MOCK === "1" && process.env.NODE_ENV !== "production" ? "text-gold" : "text-fg"}>{process.env.TRUEMONEY_MOCK === "1" && process.env.NODE_ENV !== "production" ? "เปิดอยู่ (ซองจริงใช้ไม่ได้)" : "ปิด"}</b>
        </p>
      </div>
    </div>
  );
}
