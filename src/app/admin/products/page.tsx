import Link from "next/link";
import { Plus } from "lucide-react";
import { PassIcon } from "@/components/ui";
import { iconUrl, isOnSale, isUpcoming, listAllProducts, thumbsFor } from "@/lib/products";
import { formatNumber, itemBaht } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { PageTitle, Table, thaiDate } from "../ui";
import { ToggleActive } from "./toggle";

export default async function AdminProducts() {
  const [products, st] = await Promise.all([listAllProducts(), getSettings()]);
  const thumbs = await thumbsFor(products);
  return (
    <div>
      <PageTitle
        title="สินค้า"
        sub="รหัสพาสต้องตรงกับ id ใน Config.Passes ของเกม ไม่งั้นกรอกโค้ดแล้วไม่ได้ของ"
        right={
          <Link href="/admin/products/new" className="btn btn-primary !py-2 text-sm">
            <Plus className="size-4" /> เพิ่มสินค้า
          </Link>
        }
      />
      <Table head={["", "ชื่อ", "รหัสพาส", "ราคาเต็ม", "≈ บาท", "ช่วงขาย", "สถานะ", ""]} empty={products.length === 0}>
        {products.map((p) => (
          <tr key={p.id}>
            <td className="w-14">
              <PassIcon src={iconUrl(p.iconAssetId, thumbs)} name={p.name} color={p.color} className="size-10 rounded-lg" />
            </td>
            <td className="font-semibold">
              {p.name} {p.featured && <span className="chip ml-1 text-gold">เด่น</span>}
            </td>
            <td className="font-mono text-xs text-muted">
              {p.passKey}
              {p.kind === "item" && <span className="chip ml-1 text-aqua">ไอเทม</span>}
            </td>
            <td className="tabular-nums">{formatNumber(p.priceRobux)} R$</td>
            <td className="tabular-nums">฿{formatNumber(itemBaht(p.priceRobux, st.robuxPerBaht))}</td>
            <td className="text-xs text-muted">
              {p.saleStart && <div>เริ่ม {thaiDate.format(p.saleStart)}</div>}
              {p.saleEnd && <div>ถึง {thaiDate.format(p.saleEnd)}</div>}
              {!p.saleStart && !p.saleEnd && "-"}
            </td>
            <td>
              <ToggleActive id={p.id} active={p.active} onSale={isOnSale(p)} upcoming={isUpcoming(p)} />
            </td>
            <td>
              <Link href={`/admin/products/${p.id}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                แก้ไข
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
