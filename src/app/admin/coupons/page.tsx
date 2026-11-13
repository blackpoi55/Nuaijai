import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { couponLabel } from "@/lib/coupons";
import { PageTitle, thaiDate } from "../ui";
import { BatchActions, CouponForm, CouponToggle } from "./client";

export default async function AdminCoupons() {
  const db = await getDb();
  const rows = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.id)).limit(1000);

  // ใครใช้คูปองไปบ้าง (ล่าสุด)
  const ids = rows.map((r) => r.id);
  const uses = ids.length
    ? await db
        .select({ couponId: schema.couponRedemptions.couponId, user: schema.users.displayName, at: schema.couponRedemptions.createdAt })
        .from(schema.couponRedemptions)
        .innerJoin(schema.users, eq(schema.couponRedemptions.userId, schema.users.id))
        .where(inArray(schema.couponRedemptions.couponId, ids))
        .orderBy(desc(schema.couponRedemptions.id))
    : [];
  const usedBy = new Map<number, string[]>();
  for (const u of uses) usedBy.set(u.couponId, [...(usedBy.get(u.couponId) ?? []), u.user]);

  // จัดกลุ่มตามชุดที่สร้างพร้อมกัน
  const batches: { batch: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const b = batches.find((x) => x.batch === r.batch);
    if (b) b.items.push(r);
    else batches.push({ batch: r.batch, items: [r] });
  }

  return (
    <div>
      <PageTitle title="คูปอง" sub="แจกแต้มฟรี หรือส่วนลดตอนซื้อ • คนหนึ่งใช้คูปองเดียวกันได้ครั้งเดียว" />
      <CouponForm />

      <div className="mt-8 space-y-5">
        {batches.length === 0 && <p className="glass rounded-2xl p-10 text-center text-muted">ยังไม่มีคูปอง</p>}
        {batches.map(({ batch, items }) => {
          const first = items[0];
          const used = items.reduce((s, i) => s + i.usedCount, 0);
          const total = items.reduce((s, i) => s + i.maxUses, 0);
          const expired = first.expiresAt && first.expiresAt < new Date();
          return (
            <section key={batch} className="glass rounded-2xl p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className={`chip ${first.kind === "points" ? "border-gold/30 bg-gold/10 text-gold" : "border-grape/30 bg-grape/10 text-grape"}`}>
                      {first.kind === "points" ? "แต้มฟรี" : "ส่วนลด"}
                    </span>
                    {couponLabel(first)}
                    {first.kind === "discount" && first.minBaht > 0 && <span className="text-sm font-normal text-muted">ขั้นต่ำ ฿{first.minBaht}</span>}
                  </p>
                  <p className="mt-1 text-xs text-dim">
                    {items.length} โค้ด • ใช้แล้ว {used}/{total} ครั้ง • สร้าง {thaiDate.format(first.createdAt)}
                    {first.expiresAt && <span className={expired ? "text-danger" : ""}> • หมดอายุ {thaiDate.format(first.expiresAt)}</span>}
                    {first.note && <> • {first.note}</>}
                  </p>
                </div>
                <BatchActions batch={batch} codes={items.map((i) => i.code)} anyActive={items.some((i) => i.active)} unused={items.filter((i) => i.usedCount === 0).length} />
              </header>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 ${c.active ? "" : "opacity-50"}`}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-bold tracking-wider">{c.code}</p>
                      <p className="truncate text-[11px] text-dim">
                        ใช้ {c.usedCount}/{c.maxUses}
                        {usedBy.get(c.id)?.length ? ` • ${usedBy.get(c.id)!.slice(0, 3).join(", ")}${usedBy.get(c.id)!.length > 3 ? "…" : ""}` : ""}
                      </p>
                    </div>
                    <CouponToggle id={c.id} active={c.active} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
