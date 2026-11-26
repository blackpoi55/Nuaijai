import Link from "next/link";
import { Gamepad2, ShoppingBag, Wallet } from "lucide-react";
import { HeroCard } from "@/components/hero-card";
import { BonusStrip } from "@/components/bonus-bar";
import { DropTicker, FestivalDrop } from "@/components/festival-drop";
import { listBonusTiers } from "@/lib/bonus";
import { ProductCard } from "@/components/product-card";
import { festivalOf } from "@/lib/festivals";
import type { PublicProduct } from "@/lib/products";
import { listOnSale, listUpcoming } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, upcoming, st, bonusTiers] = await Promise.all([listOnSale(), listUpcoming(), getSettings(), listBonusTiers().catch(() => [])]);
  const featured = products.find((p) => p.featured) ?? products[0];
  const passes = products.filter((p) => p.kind === "pass");
  const permanent = passes.filter((p) => !p.saleEnd);
  const limited = passes.filter((p) => p.saleEnd);
  const gacha = products.filter((p) => p.kind === "item" && p.passKey.startsWith("gacha_"));
  const boxes = products.filter((p) => p.kind === "item" && !p.passKey.startsWith("gacha_"));
  // แถบเตือนบนสุด: ของที่ใกล้ปิดก่อน ถ้าไม่มีค่อยเป็นของที่จะเปิด
  const closingFirst = [...limited].sort((a, b) => a.saleEnd!.localeCompare(b.saleEnd!))[0];
  const ticker = closingFirst
    ? { mode: "closing" as const, to: closingFirst.saleEnd!, fest: festivalOf(closingFirst.passKey), href: "#limited" }
    : upcoming[0]
      ? { mode: "opening" as const, to: upcoming[0].saleStart!, fest: festivalOf(upcoming[0].passKey), href: "#soon" }
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* ---------------- HERO ---------------- */}
      <section className="grid items-center gap-14 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-28 md:pt-24">
        <div className="animate-rise">
          {ticker && <DropTicker {...ticker} />}
          <p className="eyebrow">Nuaijai · Pass Collection</p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.2] sm:text-6xl md:text-7xl">
            เหนื่อยใจ
            <span className="mt-2 block text-gradient text-[0.62em]">
              <span className="whitespace-nowrap">สิทธิพิเศษ</span> <span className="whitespace-nowrap">เหนือระดับ</span>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg font-light text-muted">พาสและไอเทมพรีเมียม รับโค้ดทันทีหลังชำระ</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#passes" className="btn btn-primary !px-7 !py-3.5">
              เลือกซื้อ
            </a>
            <Link href="/topup" className="btn btn-ghost !px-7 !py-3.5">
              เติมแต้ม
            </Link>
          </div>
        </div>
        {featured && <HeroCard p={featured} />}
      </section>

      {/* ---------------- 3 ขั้น ---------------- */}
      <section className="mb-24 grid grid-cols-3 gap-px overflow-hidden rounded-3xl border border-line bg-line">
        {[
          { icon: Wallet, t: "เติมแต้ม" },
          { icon: ShoppingBag, t: "เลือกซื้อ" },
          { icon: Gamepad2, t: "กรอกโค้ดในเกม" },
        ].map((s, i) => (
          <div key={s.t} className="flex flex-col items-center gap-3 bg-ink-2 px-3 py-7 text-center sm:flex-row sm:justify-center sm:gap-4">
            <span className="grid size-11 place-items-center rounded-full border border-gold/30 text-gold">
              <s.icon className="size-5" strokeWidth={1.5} />
            </span>
            <span className="text-sm sm:text-base">
              <span className="mr-1.5 font-display text-gold">{i + 1}</span>
              {s.t}
            </span>
          </div>
        ))}
      </section>

      {/* ของเทศกาลขึ้นก่อน: มีเวลาจำกัด */}
      <BonusStrip tiers={bonusTiers} />
      <Drops id="limited" title="ลิมิเต็ด" note="หมดเวลาแล้วไม่วางขายอีก" mode="closing" items={limited} />
      <Drops id="soon" title="เร็วๆ นี้" note="ยังซื้อไม่ได้ — ถึงเวลาแล้วเปิดขายเองอัตโนมัติ" mode="opening" items={upcoming} />
      <Collection id="passes" title="พาสถาวร" items={permanent} />
      <Collection id="boxes" title="กล่องเลือก & บัตร" items={boxes} cols4 />
      <Collection id="gacha" title="ตั๋วสุ่มกาชา" items={gacha} cols4 />

      {products.length === 0 && upcoming.length === 0 && <p className="py-20 text-center text-muted">ยังไม่มีสินค้าวางขาย</p>}

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-2xl pb-16 pt-6">
        <Heading title="คำถามที่พบบ่อย" center />
        <div className="divide-y divide-line border-y border-line">
          <Faq q="ราคาคิดยังไง?">ราคา Robux เต็มทั้งตะกร้า ÷ {st.robuxPerBaht} ปัดขึ้นเป็นบาท</Faq>
          <Faq q="ใช้โค้ดยังไง?">ในเกม เปิดมือถือ → แอป ‘โค้ด’ → กรอกโค้ด</Faq>
          <Faq q="ซื้อให้เพื่อนได้ไหม?">ได้ เลือก ‘แยกโค้ดทีละชิ้น’ ในตะกร้า แล้วส่งโค้ดให้เพื่อน</Faq>
          <Faq q="ติดตั้งเป็นแอปได้ไหม?">
            ได้ทุกเครื่อง —{" "}
            <Link href="/install" className="text-gold hover:underline">
              ดูวิธีติดตั้ง
            </Link>
          </Faq>
        </div>
      </section>
    </div>
  );
}

/** ของเทศกาล จัดกลุ่มตามเทศกาล+เวลา แต่ละกลุ่มมีป้ายนับถอยหลังใหญ่ */
function Drops({ id, title, note, mode, items }: { id: string; title: string; note: string; mode: "closing" | "opening"; items: PublicProduct[] }) {
  if (items.length === 0) return null;
  const groups = new Map<string, { to: string; fest: ReturnType<typeof festivalOf>; items: PublicProduct[] }>();
  for (const p of items) {
    const to = (mode === "closing" ? p.saleEnd : p.saleStart)!;
    const fest = festivalOf(p.passKey);
    const k = `${fest.key}|${to}`;
    if (!groups.has(k)) groups.set(k, { to, fest, items: [] });
    groups.get(k)!.items.push(p);
  }
  const list = [...groups.values()].sort((a, b) => a.to.localeCompare(b.to));
  return (
    <section id={id} className="scroll-mt-24 pb-24">
      <Heading title={title} note={note} />
      <div className="space-y-12">
        {list.map((g, gi) => {
          const anchor = `${id}-${gi}`;
          return (
            <div key={`${g.fest.key}${g.to}`}>
              <FestivalDrop mode={mode} to={g.to} fest={g.fest} items={g.items} anchor={anchor} />
              <div id={anchor} className="grid scroll-mt-24 grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {g.items.map((p, i) => (
                  <ProductCard key={p.id} p={p} index={i} upcoming={mode === "opening"} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Collection({
  id,
  title,
  note,
  items,
  cols4,
  upcoming,
}: {
  id?: string;
  title: string;
  note?: string;
  items: Parameters<typeof ProductCard>[0]["p"][];
  cols4?: boolean;
  upcoming?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section id={id} className="scroll-mt-24 pb-24">
      <Heading title={title} note={note} />
      <div className={`grid grid-cols-2 gap-4 sm:gap-5 ${cols4 ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-3"}`}>
        {items.map((p, i) => (
          <ProductCard key={p.id} p={p} index={i} upcoming={upcoming} />
        ))}
      </div>
    </section>
  );
}

function Heading({ title, note, center }: { title: string; note?: string; center?: boolean }) {
  return (
    <div className={`mb-8 ${center ? "text-center" : ""}`}>
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      <div className={`gold-rule mt-4 w-24 ${center ? "mx-auto" : ""}`} />
      {note && <p className="mt-3 text-sm text-dim">{note}</p>}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg">
        {q}
        <span className="text-gold transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </details>
  );
}
