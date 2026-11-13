import "server-only";

// รับซองอั่งเปา TrueMoney (gift.truemoney.com) เข้าเบอร์ของร้าน
// หมายเหตุ: เป็น API ที่ไม่เป็นทางการ ถ้า TrueMoney เปลี่ยนระบบอาจต้องแก้ไฟล์นี้
// ถ้าเซิร์ฟเวอร์ต่างประเทศโดนบล็อก ให้ตั้ง TRUEMONEY_API_BASE เป็นพร็อกซีที่อยู่ในไทย

export type RedeemResult =
  | { ok: true; amount: number; sender: string | null } // amount = สตางค์
  | { ok: false; code: string; message: string; retryable: boolean };

const MESSAGES: Record<string, string> = {
  VOUCHER_NOT_FOUND: "ไม่พบซองนี้ ลองคัดลอกลิงก์ใหม่อีกครั้ง",
  VOUCHER_OUT_OF_STOCK: "ซองนี้ถูกรับไปหมดแล้ว",
  VOUCHER_EXPIRED: "ซองนี้หมดอายุแล้ว",
  TARGET_USER_REDEEMED: "ซองนี้ถูกรับเข้าร้านไปแล้ว ถ้ายังไม่ได้แต้มให้ติดต่อแอดมิน",
  CANNOT_GET_OWN_VOUCHER: "ระบบรับซองของตัวเองไม่ได้",
  TARGET_USER_NOT_FOUND: "เบอร์รับเงินของร้านมีปัญหา ติดต่อแอดมิน",
  INTERNAL_ERROR: "TrueMoney ขัดข้องชั่วคราว ลองใหม่อีกครั้ง",
};

/** รับได้ทั้งลิงก์เต็ม https://gift.truemoney.com/campaign/?v=xxxx หรือรหัสซองอย่างเดียว */
export function parseVoucher(input: string): string | null {
  const s = input.trim();
  const m = s.match(/[?&]v=([A-Za-z0-9]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{10,64}$/.test(s)) return s;
  return null;
}

function mockRedeem(hash: string): RedeemResult {
  // โหมดทดสอบ: รหัสซอง TEST<จำนวนบาท> เช่น TEST100xxxxxx
  const m = hash.match(/^TEST(\d{1,5})/i);
  if (!m) return { ok: false, code: "VOUCHER_NOT_FOUND", message: MESSAGES.VOUCHER_NOT_FOUND, retryable: false };
  return { ok: true, amount: Number(m[1]) * 100, sender: "ทดสอบ" };
}

export async function redeemVoucher(hash: string): Promise<RedeemResult> {
  if (process.env.TRUEMONEY_MOCK === "1" && process.env.NODE_ENV !== "production") return mockRedeem(hash);

  const mobile = (process.env.TRUEMONEY_PHONE ?? "").replace(/\D/g, "");
  if (mobile.length !== 10) {
    return { ok: false, code: "CONFIG", message: "ร้านยังไม่ได้ตั้งเบอร์รับเงิน", retryable: false };
  }
  const base = (process.env.TRUEMONEY_API_BASE || "https://gift.truemoney.com").replace(/\/$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}/campaign/vouchers/${encodeURIComponent(hash)}/redeem`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      },
      body: JSON.stringify({ mobile, voucher_hash: hash }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, code: "NETWORK", message: "เชื่อมต่อ TrueMoney ไม่ได้ ลองใหม่อีกครั้ง", retryable: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Cloudflare / หน้า HTML = โดนบล็อก
    return { ok: false, code: `HTTP_${res.status}`, message: "TrueMoney ไม่ตอบกลับ ลองใหม่อีกครั้ง", retryable: true };
  }

  const code: string = body?.status?.code ?? `HTTP_${res.status}`;
  if (code === "SUCCESS") {
    const baht = parseFloat(body?.data?.my_ticket?.amount_baht ?? body?.data?.voucher?.amount_baht ?? "0");
    const amount = Math.round(baht * 100);
    if (!(amount > 0)) return { ok: false, code: "ZERO", message: "ซองนี้ไม่มียอดเงิน", retryable: false };
    const sender = body?.data?.owner_profile?.full_name ?? null;
    return { ok: true, amount, sender };
  }
  return {
    ok: false,
    code,
    message: MESSAGES[code] ?? body?.status?.message ?? "รับซองไม่สำเร็จ",
    retryable: code === "INTERNAL_ERROR",
  };
}
