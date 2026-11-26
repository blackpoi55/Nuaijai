import { asc, desc, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { prettyCode } from "@/lib/codes";
import { PageTitle, thaiDate } from "../ui";
import { GiftBatchActions, GiftForm } from "./client";

export default async function AdminGifts() {
  const db = await getDb();
  const [products, rows] = await Promise.all([
    db.select().from(schema.products).orderBy(asc(schema.products.sortOrder), asc(schema.products.id)),
    db.select().from(schema.giftCodes).orderBy(desc(schema.giftCodes.id)).limit(1000),
  ]);

  // ใครใช้ไปบ้าง (ล่าสุดก่อน)
  const ids = rows.map((r) => r.id);
  const uses = ids.length
    ? await db.select().from(schema.giftRedemptions).where(inArray(schema.giftRedemptions.giftId, ids)).orderBy(desc(schema.giftRedemptions.id)).limit(3000)
    : [];
  const byGift = new Map<number, typeof uses>();
  for (const u of uses) byGift.set(u.giftId, [...(byGift.get(u.giftId) ?? []), u]);

  const batches: { batch: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const b = batches.find((x) => x.batch === r.batch);
    if (b) b.items.push(r);
    else batches.push({ batch: r.batch, items: [r] });
  }
  const now = new Date();
  const show = (c: string, many: boolean) => (many && c.length === 12 ? prettyCode(c) : c);

  return (
    <div>
      <PageTitle title="โค้ดแจกของในเกม" sub="ผู้เล่นกรอกในแอป “โค้ด” ในเกม • คนหนึ่งใช้โค้ดเดียวกันได้ครั้งเดียว • จำกัดเลเวล จำนวนคน และช่วงเวลาได้" />
      <GiftForm products={products.map((p) => ({ id: p.id, name: p.name, kind: p.kind, active: p.active }))} />

      <div className="mt-8 space-y-5">
        {batches.length === 0 && <p className="glass rounded-2xl p-10 text-center text-muted">ยังไม่มีโค้ดแจก</p>}
        {batches.map(({ batch, items }) => {
          const first = items[0];
          const many = items.length > 1;
          const used = items.reduce((s, i) => s + i.usedCount, 0);
          const total = items.reduce((s, i) => s + i.maxUses, 0);
          const active = items.some((i) => i.active);
          const ended = first.expiresAt && first.expiresAt <= now;
          const waiting = first.startsAt && first.startsAt > now;
          const full = used >= total;
          const state = !active ? ["ปิดอยู่", "text-dim"] : ended ? ["หมดอายุ", "text-danger"] : full ? ["ใช้ครบแล้ว", "text-dim"] : waiting ? ["รอเริ่ม", "text-gold"] : ["ใช้ได้", "border-leaf/30 bg-leaf/10 text-leaf"];
          const who = items.flatMap((i) => byGift.get(i.id) ?? []);
          return (
            <section key={batch} className="glass rounded-2xl p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className={`chip ${state[1]}`}>{state[0]}</span>
                    {!many && <span className="font-mono text-gold">{show(first.code, false)}</span>}
                    <span className="font-normal">{first.label}</span>
                  </p>
                  <p className="mt-1 text-xs text-dim">
                    {many && `${items.length} โค้ด • `}ใช้แล้ว {used}/{total} คน
                    {first.minLevel > 0 && <> • เลเวล {first.minLevel}+</>}
                    {first.startsAt && <span className={waiting ? "text-gold" : ""}> • เริ่ม {thaiDate.format(first.startsAt)}</span>}
                    {first.expiresAt && <span className={ended ? "text-danger" : ""}> • หมดอายุ {thaiDate.format(first.expiresAt)}</span>}
                    {first.note && <> • {first.note}</>}
                    <> • สร้าง {thaiDate.format(first.createdAt)}</>
                  </p>
                </div>
                <GiftBatchActions batch={batch} codes={items.map((i) => show(i.code, many))} active={active} unused={items.filter((i) => i.usedCount === 0).length} />
              </header>
              {many && (
                <p className="mt-3 max-h-24 overflow-y-auto font-mono text-xs text-muted">
                  {items.map((i) => (
                    <span key={i.id} className={`mr-3 ${i.usedCount >= i.maxUses ? "line-through opacity-50" : ""}`}>
                      {show(i.code, true)}
                    </span>
                  ))}
                </p>
              )}
              {who.length > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted">ใครใช้ไปแล้ว ({who.length})</summary>
                  <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    {who.slice(0, 300).map((u) => (
                      <li key={u.id} className="truncate text-muted">
                        <a href={`https://www.roblox.com/users/${u.robloxId}/profile`} target="_blank" rel="noreferrer" className="hover:underline">
                          <span className="font-semibold text-fg">{u.name ? `@${u.name}` : `ID ${u.robloxId}`}</span>
                        </a>
                        {u.level !== null && <> • Lv.{u.level}</>} • {thaiDate.format(u.createdAt)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
