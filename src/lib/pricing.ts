// ราคาบาท = ปัดขึ้น( Robux เต็มของทั้งตะกร้ารวมกัน ÷ อัตรา )  — อัตราเริ่มต้น 6
export const DEFAULT_ROBUX_PER_BAHT = 6;

export function cartBaht(totalRobux: number, rate: number = DEFAULT_ROBUX_PER_BAHT): number {
  if (totalRobux <= 0) return 0;
  return Math.ceil(totalRobux / rate);
}

/** ราคาโดยประมาณของชิ้นเดียว (ใช้แสดงบนการ์ด) */
export function itemBaht(robux: number, rate: number = DEFAULT_ROBUX_PER_BAHT): number {
  return Math.ceil(robux / rate);
}

export function formatBaht(satang: number): string {
  const baht = satang / 100;
  return baht.toLocaleString("th-TH", {
    minimumFractionDigits: Number.isInteger(baht) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(n: number): string {
  return n.toLocaleString("th-TH");
}
