import "server-only";

// ตรวจสลิปโอนเงินผ่าน SlipOK (https://slipok.com)
//   SLIPOK_API_KEY   = API Key ของร้าน
//   SLIPOK_BRANCH_ID = Branch ID (เลขสาขา)
//   SLIPOK_MOCK=1    = โหมดทดสอบในเครื่อง ไม่เรียก SlipOK จริง
// ผลลัพธ์ "ok" = สลิปจริง โอนเข้าบัญชีร้าน ยอดตรง → เติมแต้มอัตโนมัติได้
// อย่างอื่นทั้งหมด = ส่งให้แอดมินตรวจเอง (ไม่ปฏิเสธอัตโนมัติ)

export type SlipCheck =
  | { status: "ok"; transRef: string; amount: number; sender: string; note: string }
  | { status: "review"; note: string; transRef?: string };

const MAX_AGE_DAYS = 7;

/** SLIPOK_BRANCH_ID ใส่ได้ทั้งเลขสาขา หรือ URL เต็มที่ SlipOK ให้มา (https://api.slipok.com/api/line/apikey/12345) */
function branchId() {
  const raw = (process.env.SLIPOK_BRANCH_ID ?? "").trim().replace(/\/+$/, "");
  const last = raw.split("/").pop() ?? "";
  return /^[A-Za-z0-9_-]+$/.test(last) ? last : "";
}

export function slipOkConfigured() {
  return process.env.SLIPOK_MOCK === "1" || !!(process.env.SLIPOK_API_KEY && branchId());
}

const REASONS: Record<number, string> = {
  1002: "คีย์ SlipOK ไม่ถูกต้อง",
  1003: "แพ็กเกจ SlipOK หมดอายุ",
  1004: "โควต้า SlipOK หมดแล้ว",
  1005: "ไฟล์ไม่ใช่รูปภาพ",
  1006: "อ่านรูปไม่ได้",
  1007: "ไม่พบ QR บนสลิป",
  1008: "QR ไม่ใช่สลิปโอนเงิน",
  1009: "ธนาคารตอบช้า ลองใหม่ภายหลัง",
  1010: "ธนาคารยังไม่อัปเดตรายการ (สลิปเพิ่งโอน)",
  1011: "QR หมดอายุหรือไม่พบรายการ",
  1012: "สลิปซ้ำ — เคยใช้แล้ว",
  1013: "ยอดเงินไม่ตรง",
  1014: "บัญชีผู้รับไม่ตรงกับร้าน",
};

/** เลขที่ถูกปิดบาง ๆ (เช่น xxx-xxx-7727) ตรงกับเลขของร้านไหม — เทียบจากขวา ตัว x ข้ามได้ ต้องเห็นเลขอย่างน้อย 3 ตัว */
export function maskedMatches(masked: string | undefined | null, real: string) {
  if (!masked || !real) return false;
  const m = masked.replace(/[^0-9xX*]/g, "");
  if (!m || m.length > real.length) return false;
  let shown = 0;
  for (let i = 1; i <= m.length; i++) {
    const c = m[m.length - i];
    if (/[xX*]/.test(c)) continue;
    if (c !== real[real.length - i]) return false;
    shown++;
  }
  return shown >= 3;
}

type Party = { displayName?: string; name?: string; proxy?: { type?: string | null; value?: string | null } | null; account?: { type?: string | null; value?: string | null } | null };
type SlipData = { success?: boolean; transRef?: string; transDate?: string; transTime?: string; amount?: number; sender?: Party; receiver?: Party };

function parseDate(d?: string, t?: string) {
  if (!d || !/^\d{8}$/.test(d)) return null;
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t && /^\d{2}:\d{2}(:\d{2})?$/.test(t) ? t : "00:00:00"}+07:00`;
  const x = new Date(iso);
  return Number.isNaN(x.getTime()) ? null : x;
}

/** ตรวจผลจาก SlipOK เทียบกับบัญชีร้านและยอดที่ผู้ใช้แจ้ง */
export function judge(data: SlipData, shopId: string, expectedSatang: number): SlipCheck {
  const transRef = String(data.transRef ?? "").trim();
  if (!data.success || !transRef) return { status: "review", note: "SlipOK ตรวจไม่ผ่าน" };
  const amount = Math.round(Number(data.amount) * 100);
  if (!(amount > 0)) return { status: "review", note: "อ่านยอดเงินจากสลิปไม่ได้", transRef };
  const r = data.receiver ?? {};
  const toShop = maskedMatches(r.proxy?.value, shopId) || maskedMatches(r.account?.value, shopId);
  if (!toShop) return { status: "review", note: `ผู้รับไม่ใช่บัญชีร้าน (${r.proxy?.value || r.account?.value || r.displayName || "ไม่ทราบ"})`, transRef };
  if (amount !== expectedSatang) return { status: "review", note: `ยอดในสลิป ฿${(amount / 100).toLocaleString("th-TH")} ไม่ตรงกับที่แจ้ง`, transRef };
  const at = parseDate(data.transDate, data.transTime);
  if (at && Date.now() - at.getTime() > MAX_AGE_DAYS * 86400_000) return { status: "review", note: `สลิปเก่าเกิน ${MAX_AGE_DAYS} วัน`, transRef };
  const s = data.sender ?? {};
  return { status: "ok", transRef, amount, sender: s.displayName || s.name || "", note: "SlipOK ตรวจผ่าน" };
}

/** ส่งรูปสลิป (data URL) ไปตรวจ — ไม่ throw: มีปัญหาอะไรก็ตอบ review ให้แอดมินตรวจเอง */
export async function checkSlip(imageDataUrl: string, expectedSatang: number, shopId: string): Promise<SlipCheck> {
  if (process.env.SLIPOK_MOCK === "1") return mockCheck(expectedSatang, shopId);
  const key = process.env.SLIPOK_API_KEY;
  const branch = branchId();
  if (!key || !branch) return { status: "review", note: "ยังไม่ได้ตั้งค่า SlipOK" };
  try {
    const comma = imageDataUrl.indexOf(",");
    const mime = imageDataUrl.slice(5, imageDataUrl.indexOf(";")) || "image/jpeg";
    const bytes = Buffer.from(imageDataUrl.slice(comma + 1), "base64");
    const form = new FormData();
    form.append("files", new Blob([bytes], { type: mime }), "slip.jpg");
    form.append("log", "true"); // ให้ SlipOK จำสลิปไว้ จับสลิปซ้ำได้อีกชั้น
    const res = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: { "x-authorization": key },
      body: form,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => null)) as { success?: boolean; data?: SlipData; code?: number; message?: string } | null;
    if (!j) return { status: "review", note: `SlipOK ตอบกลับผิดปกติ (${res.status})` };
    if (!j.success || !j.data) {
      const code = Number(j.code);
      const reason = REASONS[code] ?? j.message ?? "SlipOK ตรวจไม่ผ่าน";
      if ([1002, 1003, 1004].includes(code)) console.error("[slipok]", code, j.message);
      return { status: "review", note: `${reason}${code ? ` (${code})` : ""}`, transRef: j.data?.transRef };
    }
    return judge(j.data, shopId, expectedSatang);
  } catch (e) {
    console.error("[slipok]", e);
    return { status: "review", note: "เชื่อมต่อ SlipOK ไม่ได้" };
  }
}

// โหมดทดสอบ (ตามยอดที่แจ้ง): ฿7 = บัญชีอื่น • ฿13 = ยอดไม่ตรง • ฿55 = เลขรายการเดิมทุกครั้ง (ทดสอบสลิปซ้ำ) • ฿99 = เชื่อมต่อไม่ได้ • อื่น ๆ ผ่าน
function mockCheck(expectedSatang: number, shopId: string): SlipCheck {
  const baht = expectedSatang / 100;
  if (baht === 99) return { status: "review", note: "เชื่อมต่อ SlipOK ไม่ได้" };
  const masked = `xxx-xxx-${shopId.slice(-4)}`;
  return judge(
    {
      success: true,
      transRef: baht === 55 ? "MOCKDUP55" : `MOCK${Date.now()}${Math.floor(Math.random() * 1e6)}`,
      transDate: new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10).replace(/-/g, ""),
      transTime: "12:00:00",
      amount: baht === 13 ? 12 : baht,
      sender: { displayName: "นาย ทดสอบ ส" },
      receiver: { displayName: "ร้าน", proxy: { type: "MSISDN", value: baht === 7 ? "xxx-xxx-1234" : masked } },
    },
    shopId,
    expectedSatang,
  );
}
