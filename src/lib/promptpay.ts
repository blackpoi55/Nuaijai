// สร้างข้อความ QR พร้อมเพย์ (มาตรฐาน EMVCo ของ ธปท.) ใส่ยอดเงินในตัว — ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์

/** ยอดเติมขั้นต่ำ/สูงสุดของพร้อมเพย์ (บาท) */
export const MIN_SLIP_BAHT = 20;
export const MAX_SLIP_BAHT = 50000;

function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** target = เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก; amount = บาท (ไม่ใส่ = ให้ผู้โอนกรอกเอง) */
export function promptPayPayload(target: string, amount?: number) {
  const id = target.replace(/\D/g, "");
  const account =
    id.length === 13
      ? tlv("02", id) // เลขบัตรประชาชน / เลขผู้เสียภาษี
      : tlv("01", ("0000000000000" + id.replace(/^0/, "66")).slice(-13)); // เบอร์มือถือ 0066xxxxxxxxx
  let s =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("58", "TH") +
    tlv("53", "764");
  if (amount) s += tlv("54", amount.toFixed(2));
  s += "6304";
  return s + crc16(s);
}

export function maskPhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d;
}
