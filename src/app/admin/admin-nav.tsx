"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, LayoutDashboard, Package, Receipt, Settings, Shield, Ticket, Users } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/products", label: "สินค้า", icon: Package },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
  { href: "/admin/slips", label: "สลิปพร้อมเพย์", icon: Receipt },
  { href: "/admin/topups", label: "ซองอั่งเปา", icon: Gift },
  { href: "/admin/codes", label: "คำสั่งซื้อ / โค้ด", icon: Ticket },
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings },
];

export function AdminNav({ pendingSlips = 0 }: { pendingSlips?: number }) {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-3 hidden items-center gap-2 px-3 text-xs font-bold tracking-widest text-dim lg:flex">
        <Shield className="size-4" /> ADMIN
      </p>
      <nav className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on(i.href) ? "bg-white/10 text-fg" : "text-muted hover:bg-white/5 hover:text-fg"}`}
          >
            <i.icon className={`size-4 ${on(i.href) ? "text-leaf" : ""}`} /> {i.label}
            {i.href === "/admin/slips" && pendingSlips > 0 && (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-rose px-1.5 text-[11px] font-bold text-white">{pendingSlips}</span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
