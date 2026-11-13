import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb, schema } from "@/db";
import { PageTitle } from "../../ui";
import { ProductForm } from "./form";

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const bkk = new Date(d.getTime() + 7 * 3600_000);
  return bkk.toISOString().slice(0, 16);
}

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let initial = null;
  if (id !== "new") {
    const db = await getDb();
    const [p] = await db.select().from(schema.products).where(eq(schema.products.id, Number(id) || 0));
    if (!p) notFound();
    initial = {
      id: p.id,
      passKey: p.passKey,
      kind: p.kind,
      robloxProductId: String(p.robloxProductId),
      name: p.name,
      blurb: p.blurb,
      perks: p.perks.map((k) => (k.d ? `${k.t} | ${k.d}` : k.t)).join("\n"),
      color: p.color,
      iconAssetId: p.iconAssetId ? String(p.iconAssetId) : "",
      priceRobux: String(p.priceRobux),
      active: p.active,
      featured: p.featured,
      sortOrder: String(p.sortOrder),
      saleEnd: toLocalInput(p.saleEnd),
    };
  }
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> สินค้าทั้งหมด
      </Link>
      <PageTitle title={initial ? `แก้ไข: ${initial.name}` : "เพิ่มสินค้า"} />
      <ProductForm initial={initial} />
    </div>
  );
}
