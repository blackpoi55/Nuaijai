import Link from "next/link";
import { ArrowRight, Calculator, Gamepad2, Gift, Package, ShoppingBag, Sparkles, Ticket, Timer, Wallet, Zap } from "lucide-react";
import { HeroCard } from "@/components/hero-card";
import { ProductCard } from "@/components/product-card";
import { listOnSale } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, st] = await Promise.all([listOnSale(), getSettings()]);
  const featured = products.find((p) => p.featured) ?? products[0];
  const passes = products.filter((p) => p.kind === "pass");
  const permanent = passes.filter((p) => !p.saleEnd);
  const limited = passes.filter((p) => p.saleEnd);
  const gacha = products.filter((p) => p.kind === "item" && p.passKey.startsWith("gacha_"));
  const boxes = products.filter((p) => p.kind === "item" && !p.passKey.startsWith("gacha_"));

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* ---------------- HERO ---------------- */}
      <section className="grid items-center gap-12 pb-16 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div className="animate-rise">
          <span className="chip border-leaf/30 bg-leaf/10 text-leaf">
            <Sparkles className="size-3.5" /> พาสแมพเหนื่อยใจ • ได้โค้ดทันที
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
            ซื้อพาสเหนื่อยใจ
            <br />
            <span className="text-shine">คุ้มกว่า ง่ายกว่า</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            เติมแต้มด้วยซองอั่งเปา TrueMoney หรือพร้อมเพย์ เลือกพาสลงตะกร้า แล้วรับโค้ดไปกรอกในเกมได้ทันที
            ราคาคิดจาก Robux เต็ม ÷ {st.robuxPerBaht}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#passes" className="btn btn-primary !px-6 !py-3.5 text-base">
              <ShoppingBag className="size-5" /> เลือกพาสเลย
            </a>
            <Link href="/topup" className="btn btn-ghost !px-6 !py-3.5 text-base">
              <Wallet className="size-5 text-gold" /> เติมแต้ม
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <Stat icon={Calculator} k={`÷ ${st.robuxPerBaht}`} v="Robux เป็นบาท" />
            <Stat icon={Zap} k="ทันที" v="ได้โค้ดหลังจ่าย" />
            <Stat icon={Gift} k="แจกได้" v="ซื้อให้เพื่อนได้" />
          </dl>
        </div>
        {featured && <HeroCard p={featured} />}
      </section>

      {/* ---------------- STEPS ---------------- */}
      <section className="grid gap-4 pb-20 md:grid-cols-3">
        <Step n={1} icon={Wallet} title="เติมแต้ม" text="ซองอั่งเปา TrueMoney แต้มเข้าทันที หรือโอนพร้อมเพย์แล้วแนบสลิปให้แอดมินตรวจ • 1 บาท = 1 แต้ม" />
        <Step n={2} icon={ShoppingBag} title="เลือกพาส" text="ใส่พาสลงตะกร้า ราคารวมคิดจาก Robux ทั้งตะกร้า ÷ 6 แล้วปัดเศษขึ้น" />
        <Step n={3} icon={Gamepad2} title="กรอกโค้ดในเกม" text="ได้โค้ดทันที เปิดมือถือในเกม → แอปโค้ด → กรอกโค้ด รับพาสถาวร" />
      </section>

      {/* ---------------- PASSES ---------------- */}
      <section id="passes" className="scroll-mt-24 pb-16">
        <SectionTitle title="พาสถาวร" sub="ซื้อครั้งเดียว ใช้ได้ตลอด" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {permanent.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      {limited.length > 0 && (
        <section className="pb-16">
          <SectionTitle title="ของลิมิเต็ด" sub="ขายช่วงเทศกาลเท่านั้น หมดเวลาแล้วหายจากร้าน" icon={Timer} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {limited.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {boxes.length > 0 && (
        <section id="boxes" className="scroll-mt-24 pb-16">
          <SectionTitle title="กล่องเลือก & บัตร" sub="ซื้อซ้ำได้ ซื้อหลายชิ้นรวมในโค้ดเดียวได้" icon={Package} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boxes.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {gacha.length > 0 && (
        <section id="gacha" className="scroll-mt-24 pb-16">
          <SectionTitle title="ตั๋วสุ่มกาชา" sub="ยิ่งซื้อแพ็กใหญ่ยิ่งคุ้ม • ตั๋วแลกเปลี่ยนได้" icon={Ticket} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gacha.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && <p className="py-20 text-center text-muted">ยังไม่มีสินค้าวางขาย</p>}

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-3xl pb-10">
        <SectionTitle title="คำถามที่พบบ่อย" center />
        <div className="space-y-3">
          <Faq q="ราคาคิดยังไง?">
            เอาราคา Robux เต็มของทุกชิ้นในตะกร้ามารวมกัน แล้วหาร {st.robuxPerBaht} ปัดเศษขึ้นเป็นบาท เช่น VIP 89 R$ + ลำโพง 69 R$ = 158 R$ ÷ {st.robuxPerBaht} = 26.33 → จ่าย 27 บาท
          </Faq>
          <Faq q="เติมแต้มยังไง?">
            เปิดแอป TrueMoney → ส่งซองของขวัญ (อั่งเปา) → ใส่จำนวนเงิน เลือกแบ่ง 1 คน → คัดลอกลิงก์ซอง แล้ววางในหน้าเติมแต้ม ระบบจะรับซองและบวกแต้มให้อัตโนมัติ หรือเลือกแท็บพร้อมเพย์ สแกน QR โอนเงิน แล้วแนบสลิป แต้มเข้าหลังแอดมินตรวจ
          </Faq>
          <Faq q="ใช้โค้ดยังไง?">
            เข้าเกมเหนื่อยใจ เปิดมือถือในเกม → แอป ‘โค้ด’ → กรอกโค้ด แล้วกดรับของ พาสจะเข้าตัวละครทันที โค้ดใช้ได้ครั้งเดียว
          </Faq>
          <Faq q="ซื้อให้เพื่อนได้ไหม?">
            ได้ ส่งโค้ดให้เพื่อนไปกรอกเอง ถ้าจะแจกหลายคน ให้เลือก ‘แยกโค้ดทีละชิ้น’ ในตะกร้า
          </Faq>
          <Faq q="ติดตั้งเป็นแอปบนมือถือได้ไหม?">
            ได้ทั้ง Android, iPhone, คอม Windows และ Mac ไม่ต้องโหลดจาก Store และรับแจ้งเตือนได้ ดูวิธีทีละขั้นที่{" "}
            <Link href="/install" className="font-semibold text-leaf hover:underline">
              หน้าติดตั้งแอป
            </Link>
          </Faq>
          <Faq q="ถ้ามีพาสนั้นอยู่แล้วกรอกโค้ดจะเป็นยังไง?">
            เกมจะไม่ให้ใช้โค้ด และโค้ดยังไม่ถูกใช้ ส่งต่อให้คนอื่นได้
          </Faq>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, k, v }: { icon: typeof Zap; k: string; v: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className="size-4 text-leaf" />
      <dt className="mt-2 text-lg font-extrabold">{k}</dt>
      <dd className="text-xs text-muted">{v}</dd>
    </div>
  );
}

function Step({ n, icon: Icon, title, text }: { n: number; icon: typeof Zap; title: string; text: string }) {
  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-6">
      <span className="absolute -right-3 -top-6 text-[7rem] font-black leading-none text-white/[0.04] transition group-hover:text-white/[0.07]">{n}</span>
      <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/10 ring-1 ring-white/10">
        <Icon className="size-6 text-leaf" />
      </div>
      <h3 className="mt-4 text-lg font-bold">
        <span className="text-dim">{n}.</span> {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted">{text}</p>
      {n < 3 && <ArrowRight className="absolute bottom-6 right-6 hidden size-5 text-dim md:block" />}
    </div>
  );
}

function SectionTitle({ title, sub, icon: Icon, center }: { title: string; sub?: string; icon?: typeof Zap; center?: boolean }) {
  return (
    <div className={`mb-6 ${center ? "text-center" : ""}`}>
      <h2 className={`flex items-center gap-2 text-2xl font-extrabold sm:text-3xl ${center ? "justify-center" : ""}`}>
        {Icon && <Icon className="size-6 text-rose" />} {title}
      </h2>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="glass group rounded-2xl px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        {q}
        <span className="grid size-7 place-items-center rounded-lg bg-white/5 text-muted transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>
    </details>
  );
}
