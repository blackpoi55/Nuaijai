import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listBonusTiers } from "@/lib/bonus";
import { listAllProducts } from "@/lib/products";
import { PageTitle } from "../ui";
import { BonusPreview, BonusRow, type RuleRow } from "./client";

export default async function AdminBonus() {
  const db = await getDb();
  const [products, rules, tiers] = await Promise.all([listAllProducts(), db.select().from(schema.bonusRules).orderBy(asc(schema.bonusRules.minBaht)), listBonusTiers()]);
  const opts = products.map((p) => ({ id: p.id, name: p.name, kind: p.kind }));
  const byKey = new Map(products.map((p) => [p.passKey, p]));
  const now = new Date();

  return (
    <div>
      <PageTitle title="ของแถมตามยอดซื้อ" sub="ซื้อครบยอดในคำสั่งซื้อเดียว ได้โค้ดของแถมเพิ่มอีกใบอัตโนมัติ" />

      <ul className="glass mb-6 space-y-1.5 rounded-2xl p-5 text-sm text-muted">
        <li>• คิดจาก<b className="text-fg">ยอดที่จ่ายจริง</b> (หลังหักคูปองแล้ว) ในคำสั่งซื้อเดียว</li>
        <li>• ถึงหลายขั้น ได้<b className="text-fg">ขั้นที่สูงสุดขั้นเดียว</b> เช่น ตั้ง ฿300 กับ ฿500 แล้วซื้อ ฿600 → ได้ของขั้น ฿500</li>
        <li>• ของแถมเป็นโค้ดอีกใบในคำสั่งซื้อนั้น กรอกในเกมเหมือนโค้ดปกติ • ยกเลิกคำสั่งซื้อครบทุกใบ ของแถมที่ยังไม่ใช้ถูกยกเลิกด้วย</li>
        <li>• กดรูปปฏิทินถ้าอยากให้แถมแค่ช่วงเทศกาล</li>
      </ul>

      <div className="space-y-3">
        {rules.map((r) => {
          const p = byKey.get(r.passKey);
          const status: [string, string] = !p
            ? ["ไม่พบสินค้า", "text-danger"]
            : !r.active
              ? ["ปิดอยู่", "text-dim"]
              : r.endsAt && r.endsAt <= now
                ? ["หมดเวลา", "text-danger"]
                : r.startsAt && r.startsAt > now
                  ? ["รอเริ่ม", "text-gold"]
                  : ["ใช้อยู่", "border-leaf/30 bg-leaf/10 text-leaf"];
          const row: RuleRow = {
            id: r.id,
            minBaht: r.minBaht,
            productId: p?.id ?? 0,
            qty: r.qty,
            active: r.active,
            startsAt: r.startsAt?.toISOString() ?? null,
            endsAt: r.endsAt?.toISOString() ?? null,
          };
          return <BonusRow key={r.id} rule={row} products={opts} status={status} />;
        })}
        <p className="pt-2 text-sm font-semibold">{rules.length ? "เพิ่มขั้นใหม่" : "เพิ่มของแถมขั้นแรก"}</p>
        <BonusRow products={opts} />
      </div>

      <section className="glass mt-8 rounded-2xl p-5">
        <h2 className="mb-3 font-bold">ลูกค้าจะเห็นแบบนี้ในตะกร้า</h2>
        <BonusPreview tiers={tiers} />
      </section>
    </div>
  );
}
