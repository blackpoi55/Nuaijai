// ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์

export type BonusTier = { minBaht: number; name: string; qty: number; color: string; iconUrl: string | null; endsAt: string | null };

/** "ตั๋วสุ่มกาชา ×1" × 5 → "ตั๋วสุ่มกาชา ×5" (ชื่อที่ลงท้าย ×N คูณให้เลย อ่านง่ายกว่า) */
export function bonusName(t: Pick<BonusTier, "name" | "qty">) {
  if (t.qty <= 1) return t.name;
  const m = t.name.match(/^(.*?)\s*×\s*(\d+)$/);
  return m ? `${m[1]} ×${Number(m[2]) * t.qty}` : `${t.name} ×${t.qty}`;
}

/** ตอนนี้ได้ขั้นไหน และขั้นถัดไปต้องซื้ออีกเท่าไหร่ (tiers เรียงยอดน้อยไปมาก) */
export function bonusProgress(tiers: BonusTier[], paidBaht: number) {
  let got: BonusTier | null = null;
  let next: BonusTier | null = null;
  for (const t of tiers) {
    if (paidBaht >= t.minBaht) got = t;
    else if (!next) next = t;
  }
  return { got, next, need: next ? next.minBaht - paidBaht : 0 };
}
