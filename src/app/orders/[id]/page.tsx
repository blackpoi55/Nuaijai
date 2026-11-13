import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { getDb, schema } from "@/db";
import { CodeTicket, HowTo } from "@/components/code-ticket";
import { requireUser } from "@/lib/auth";
import { listAllProducts } from "@/lib/products";
import { formatNumber } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/orders/${id}`);
  const oid = Number(id);
  if (!Number.isInteger(oid)) notFound();
  const db = await getDb();
  const [o] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, oid), user.role === "admin" ? undefined : eq(schema.orders.userId, user.id)))
    .limit(1);
  if (!o) notFound();
  const [codes, products] = await Promise.all([db.select().from(schema.codes).where(eq(schema.codes.orderId, o.id)), listAllProducts()]);
  const colors = Object.fromEntries(products.map((p) => [p.passKey, p.color]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> โค้ดทั้งหมด
      </Link>

      {isNew && (
        <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-gold/30 bg-gradient-to-b from-amber-200/10 to-transparent p-8 text-center">
          <Confetti />
          <div className="animate-pop mx-auto grid size-16 place-items-center rounded-2xl bg-leaf/20">
            <PartyPopper className="size-8 text-leaf" />
          </div>
          <h1 className="mt-4 text-3xl font-black">ซื้อสำเร็จ!</h1>
          <p className="mt-1 text-muted">คัดลอกโค้ดด้านล่างไปกรอกในเกมได้เลย</p>
        </div>
      )}

      <section className="glass rounded-3xl p-5 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">คำสั่งซื้อ #{o.id}</h2>
          <span className="text-sm text-muted">
            {formatNumber(o.totalRobux)} R$ ÷ {o.robuxPerBaht} → <b className="text-fg">฿{formatNumber(o.totalBaht)}</b>
          </span>
        </header>
        <div className="space-y-3">
          {codes.map((c) => (
            <CodeTicket key={c.id} c={c} colors={colors} />
          ))}
        </div>
        <ul className="mt-5 space-y-1 border-t border-line pt-4 text-sm text-muted">
          {o.items.map((i) => (
            <li key={i.productId} className="flex justify-between">
              <span>
                {i.name} × {i.qty}
              </span>
              <span className="tabular-nums">{formatNumber(i.priceRobux * i.qty)} R$</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-6">
        <HowTo />
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ["#34d399", "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="absolute top-[-10%] block h-3 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti ${2.2 + (i % 5) * 0.35}s ${(i % 7) * 0.12}s ease-in forwards`,
            transform: `rotate(${i * 47}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confetti{to{transform:translateY(420px) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}
