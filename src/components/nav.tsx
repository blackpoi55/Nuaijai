"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Shield, ShoppingBag, Store, Ticket, User, Wallet } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { formatBaht } from "@/lib/pricing";
import { NotificationBell } from "./bell";
import { CartButton, useCart } from "./cart";
import { InstallButton } from "./pwa";

type NavUser = { name: string; points: number; admin: boolean; unread: number } | null;

const LINKS = [
  { href: "/", label: "ร้านค้า", icon: Store },
  { href: "/topup", label: "เติมแต้ม", icon: Wallet },
  { href: "/orders", label: "โค้ดของฉัน", icon: Ticket },
];

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/192.png" alt="" className="size-10 rounded-2xl shadow-lg shadow-amber-500/20 ring-1 ring-white/15 transition-transform group-hover:rotate-6" />
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight">เหนื่อยใจ</span>
        <span className="text-shine block text-[10px] font-bold tracking-[0.3em]">PASS SHOP</span>
      </span>
    </Link>
  );
}

export function Nav({ user, vapidKey }: { user: NavUser; vapidKey: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-ink/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${active(l.href) ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link href="/topup" className="group flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 transition hover:bg-amber-300/15">
                  <Wallet className="size-4 text-gold" />
                  <span className="font-bold tabular-nums text-gold">{formatBaht(user.points)}</span>
                  <span className="hidden text-xs text-amber-200/70 sm:inline">แต้ม</span>
                  <span className="hidden rounded-lg bg-gold px-1.5 text-[11px] font-bold text-ink group-hover:inline sm:group-hover:inline">+ เติม</span>
                </Link>
                <InstallButton className="hidden sm:inline-flex" />
                <NotificationBell initialUnread={user.unread} vapidKey={vapidKey} />
                <CartButton className="hidden md:inline-flex" />
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <InstallButton />
                <CartButton className="hidden md:inline-flex" />
                <Link href="/login" className="btn btn-ghost !py-2 text-sm">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="btn btn-primary hidden !py-2 text-sm sm:inline-flex">
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* แถบล่างบนมือถือ */}
      <MobileBar active={active} />
    </>
  );
}

function MobileBar({ active }: { active: (h: string) => boolean }) {
  const { setOpen, count } = useCart();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-3xl border border-line bg-ink-2/85 p-1.5 shadow-2xl backdrop-blur-xl md:hidden">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold transition ${active(l.href) ? "bg-white/10 text-fg" : "text-muted"}`}
        >
          <l.icon className={`size-5 ${active(l.href) ? "text-gold" : ""}`} />
          {l.label}
        </Link>
      ))}
      <button onClick={() => setOpen(true)} className="relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold text-muted">
        <ShoppingBag className="size-5" />
        ตะกร้า
        {count > 0 && <span className="absolute right-4 top-1 grid size-4 place-items-center rounded-full bg-rose text-[10px] font-bold text-white">{count}</span>}
      </button>
    </nav>
  );
}

function UserMenu({ user }: { user: NonNullable<NavUser> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost !px-2.5 !py-2" aria-label="เมนูบัญชี">
        <span className="grid size-7 place-items-center rounded-full border border-gold/40 bg-gold/10 text-sm font-semibold text-gold">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className={`hidden size-4 transition sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-rise absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-ink-2/[0.97] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl" style={{ animationDuration: ".2s" }}>
          <div className="px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <User className="size-4 text-muted" /> {user.name}
            </p>
          </div>
          <MenuLink href="/orders" icon={Ticket} label="โค้ดของฉัน" onClick={() => setOpen(false)} />
          <MenuLink href="/topup" icon={Wallet} label="เติมแต้ม / ประวัติ" onClick={() => setOpen(false)} />
          {user.admin && <MenuLink href="/admin" icon={Shield} label="หลังบ้านแอดมิน" onClick={() => setOpen(false)} />}
          <InstallButton className="!w-full !justify-start !rounded-xl !border-0 !bg-transparent !px-3 hover:!bg-white/5 [&>span]:!inline" />
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger hover:bg-white/5">
              <LogOut className="size-4" /> ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, label, onClick }: { href: string; icon: typeof User; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
      <Icon className="size-4 text-muted" /> {label}
    </Link>
  );
}
