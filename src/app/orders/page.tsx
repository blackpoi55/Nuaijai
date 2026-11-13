import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ShoppingBag, Ticket } from "lucide-react";
import { getDb, schema } from "@/db";
import { CodeTicket, HowTo } from "@/components/code-ticket";
import { MyCoupons } from "@/components/my-coupons";
import { listMyCoupons } from "@/lib/coupons";
import { requireUser } from "@/lib/auth";
import { listAllProducts } from "@/lib/products";
import { formatNumber } from "@/lib/pricing";

export const metadata = { title: "โค้ดของฉัน" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const db = await getDb();
  const [orders, codes, products, myCoupons] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.id)).limit(100),
    db.select().from(schema.codes).where(eq(schema.codes.userId, user.id)).orderBy(desc(schema.codes.id)).limit(500),
    listAllProducts(),
    listMyCoupons(user.id),
  ]);
  const colors = Object.fromEntries(products.map((p) => [p.passKey, p.color]));
  const active = codes.filter((c) => c.status === "active").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black">
            <Ticket className="size-7 text-leaf" /> โค้ดของฉัน
          </h1>
          <p className="mt-1 text-muted">มีโค้ดที่ยังไม่ได้ใช้ {active} ใบ</p>
        </div>
        <HowTo />
      </div>

      <MyCoupons items={myCoupons} />

      {orders.length === 0 && (
        <div className="glass mt-8 rounded-3xl p-10 text-center">
          <ShoppingBag className="mx-auto size-10 text-dim" />
          <p className="mt-3 font-semibold">ยังไม่มีคำสั่งซื้อ</p>
          <Link href="/#passes" className="btn btn-primary mt-5">
            ไปเลือกพาส
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {orders.map((o) => (
          <section key={o.id} className="glass rounded-3xl p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link href={`/orders/${o.id}`} className="font-bold hover:underline">
                คำสั่งซื้อ #{o.id}
              </Link>
              <span className="text-muted">
                {fmt.format(o.createdAt)} · {formatNumber(o.totalRobux)} R$ → ฿{formatNumber(o.totalBaht)}
              </span>
            </header>
            <div className="space-y-3">
              {codes
                .filter((c) => c.orderId === o.id)
                .map((c) => (
                  <CodeTicket key={c.id} c={c} colors={colors} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
