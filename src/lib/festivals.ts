// หน้าตาของแต่ละเทศกาล (ดูจากรหัสพาสในเกม: lp_ = ลอยกระทง, xp_ = คริสต์มาส, hw_ = ฮาโลวีน)
// เทศกาลใหม่ = เพิ่มบรรทัดที่นี่ ไม่งั้นจะใช้หน้าตา "ลิมิเต็ด" ทั่วไป
export type Festival = { key: string; name: string; emoji: string; c1: string; c2: string };

const LIST: (Festival & { prefix: string })[] = [
  { prefix: "lp_", key: "loykrathong", name: "ลอยกระทง", emoji: "🏮", c1: "#ff7a3d", c2: "#ffd36e" },
  { prefix: "xp_", key: "christmas", name: "คริสต์มาส", emoji: "🎄", c1: "#ff5a6a", c2: "#9edcff" },
  { prefix: "hw_", key: "halloween", name: "ฮาโลวีน", emoji: "🎃", c1: "#ff8c32", c2: "#b07cf5" },
];

const GENERIC: Festival = { key: "limited", name: "ลิมิเต็ด", emoji: "⏳", c1: "#e2c27d", c2: "#f3e3bd" };

export function festivalOf(passKey: string): Festival {
  return LIST.find((f) => passKey.startsWith(f.prefix)) ?? GENERIC;
}
