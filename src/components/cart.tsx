"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { Gift, Minus, Plus, ShoppingBag, Sparkles, Ticket, TicketPercent, Trash2, Wallet, X } from "lucide-react";
import { checkDiscountCouponAction } from "@/app/actions/coupon";
import { checkoutAction } from "@/app/actions/shop";
import type { PublicProduct } from "@/lib/products";
import { cartBaht, formatBaht, formatNumber } from "@/lib/pricing";
import { PassIcon } from "./ui";

type Mode = "single" | "split";
type Toast = { id: number; text: string; kind: "ok" | "err" };

type MyCoupon = { code: string; label: string; minBaht: number };

type Ctx = {
  products: PublicProduct[];
  myCoupons: MyCoupon[];
  /** เปิดตะกร้าพร้อมใส่คูปองนี้ให้ (เช่น กดจากหน้าโค้ดของฉัน) */
  openCartWithCoupon: (code: string) => void;
  requestedCoupon: string | null;
  clearRequestedCoupon: () => void;
  rate: number;
  signedIn: boolean;
  points: number;
  qty: Record<number, number>;
  add: (id: number) => void;
  setQty: (id: number, q: number) => void;
  clear: () => void;
  count: number;
  totalRobux: number;
  totalBaht: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  toast: (text: string, kind?: "ok" | "err") => void;
};

const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};

const KEY = "nh_cart_v1";

export function CartProvider({
  products,
  rate,
  signedIn,
  points,
  myCoupons = [],
  children,
}: {
  products: PublicProduct[];
  rate: number;
  signedIn: boolean;
  points: number;
  myCoupons?: MyCoupon[];
  children: React.ReactNode;
}) {
  const [requestedCoupon, setRequestedCoupon] = useState<string | null>(null);
  const [qty, setQtyState] = useState<Record<number, number>>({});
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setQtyState(JSON.parse(raw));
    } catch {}
  }, []);

  // ตัดของที่เลิกขายแล้วออกจากตะกร้า
  const valid = useMemo(() => {
    const ids = new Set(products.map((p) => p.id));
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(qty)) if (ids.has(Number(k)) && v > 0) out[Number(k)] = v;
    return out;
  }, [qty, products]);

  const persist = (next: Record<number, number>) => {
    setQtyState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const toast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const add = (id: number) => {
    persist({ ...valid, [id]: Math.min(20, (valid[id] ?? 0) + 1) });
    const p = products.find((x) => x.id === id);
    toast(`ใส่ ${p?.name ?? "ของ"} ลงตะกร้าแล้ว`);
  };
  const setQty = (id: number, q: number) => {
    const next = { ...valid };
    if (q <= 0) delete next[id];
    else next[id] = Math.min(20, q);
    persist(next);
  };
  const clear = () => persist({});

  const totalRobux = products.reduce((s, p) => s + (valid[p.id] ?? 0) * p.priceRobux, 0);
  const count = Object.values(valid).reduce((s, n) => s + n, 0);

  const value: Ctx = {
    products,
    myCoupons,
    openCartWithCoupon: (code: string) => {
      setRequestedCoupon(code);
      setOpen(true);
    },
    requestedCoupon,
    clearRequestedCoupon: () => setRequestedCoupon(null),
    rate,
    signedIn,
    points,
    qty: valid,
    add,
    setQty,
    clear,
    count,
    totalRobux,
    totalBaht: cartBaht(totalRobux, rate),
    open,
    setOpen,
    toast,
  };

  return (
    <CartCtx.Provider value={value}>
      {children}
      <CartDrawer />
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass animate-rise rounded-2xl px-4 py-2.5 text-sm font-medium shadow-2xl ${t.kind === "err" ? "text-danger" : "text-fg"}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </CartCtx.Provider>
  );
}

export function CartButton({ className = "" }: { className?: string }) {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className={`btn btn-ghost relative !px-3 ${className}`} aria-label="เปิดตะกร้า">
      <ShoppingBag className="size-5" />
      <span className="hidden sm:inline">ตะกร้า</span>
      {count > 0 && (
        <span key={count} className="animate-pop absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-rose text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export function AddToCartButton({ id, className = "", label = "ใส่ตะกร้า" }: { id: number; className?: string; label?: string }) {
  const { add } = useCart();
  return (
    <button onClick={() => add(id)} className={`btn btn-primary ${className}`}>
      <Plus className="size-4" />
      {label}
    </button>
  );
}

function CartDrawer() {
  const c = useCart();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");
  const [err, setErr] = useState<{ text: string; need?: number } | null>(null);
  const [pending, start] = useTransition();
  const [couponText, setCouponText] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountBaht: number; label: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  const lines = c.products.filter((p) => c.qty[p.id]);
  const hasMulti = lines.some((p) => p.kind === "pass" && c.qty[p.id] > 1);
  const effMode: Mode = hasMulti ? "split" : mode;
  const codeCount = effMode === "single" ? (lines.length ? 1 : 0) : c.count;
  const discount = coupon ? Math.min(coupon.discountBaht, c.totalBaht) : 0;
  const payBaht = c.totalBaht - discount;
  const cost = payBaht * 100;

  const applyCoupon = (code: string) => {
    setCouponMsg(null);
    startCheck(async () => {
      const r = await checkDiscountCouponAction(code, c.totalBaht);
      if (r.ok) setCoupon({ code: r.code, discountBaht: r.discountBaht, label: r.label });
      else {
        setCoupon(null);
        setCouponMsg(r.message);
      }
    });
  };

  // เปิดตะกร้ามาพร้อมคูปองที่ขอ (จากหน้าโค้ดของฉัน)
  useEffect(() => {
    if (c.open && c.requestedCoupon && c.totalBaht > 0) {
      applyCoupon(c.requestedCoupon);
      c.clearRequestedCoupon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.open, c.requestedCoupon, c.totalBaht]);

  // ยอดในตะกร้าเปลี่ยน = คิดส่วนลดใหม่
  useEffect(() => {
    if (coupon && c.totalBaht > 0) applyCoupon(coupon.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.totalBaht]);
  const short = Math.max(0, cost - c.points);

  useEffect(() => {
    if (!c.open) setErr(null);
    document.body.style.overflow = c.open ? "hidden" : "";
  }, [c.open]);

  const checkout = () => {
    setErr(null);
    start(async () => {
      const r = await checkoutAction({ items: lines.map((p) => ({ id: p.id, qty: c.qty[p.id] })), mode: effMode, coupon: coupon?.code });
      if (r.ok) {
        c.clear();
        setCoupon(null);
        setCouponText("");
        c.setOpen(false);
        router.push(`/orders/${r.orderId}?new=1`);
        router.refresh();
      } else {
        setErr({ text: r.message, need: r.need });
      }
    });
  };

  return (
    <div className={`fixed inset-0 z-[60] ${c.open ? "" : "pointer-events-none"}`} aria-hidden={!c.open}>
      <div
        onClick={() => c.setOpen(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${c.open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-ink-2/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${c.open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="size-5 text-leaf" /> ตะกร้าของฉัน
            {c.count > 0 && <span className="chip">{c.count} ชิ้น</span>}
          </div>
          <button onClick={() => c.setOpen(false)} className="btn btn-ghost !p-2" aria-label="ปิด">
            <X className="size-5" />
          </button>
        </header>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {lines.length === 0 && (
            <div className="grid h-full place-items-center text-center text-muted">
              <div>
                <div className="mx-auto mb-4 grid size-20 place-items-center rounded-3xl bg-white/5">
                  <ShoppingBag className="size-9 text-dim" />
                </div>
                <p className="font-semibold text-fg">ตะกร้ายังว่างอยู่</p>
                <p className="mt-1 text-sm">เลือกพาสที่ชอบแล้วกด ‘ใส่ตะกร้า’ ได้เลย</p>
              </div>
            </div>
          )}
          {lines.map((p) => (
            <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <PassIcon src={p.iconUrl} name={p.name} color={p.color} className="size-14 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{formatNumber(p.priceRobux)} R$</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-black/30 p-1">
                <button className="grid size-8 place-items-center rounded-lg hover:bg-white/10" onClick={() => c.setQty(p.id, c.qty[p.id] - 1)} aria-label="ลด">
                  {c.qty[p.id] === 1 ? <Trash2 className="size-4 text-danger" /> : <Minus className="size-4" />}
                </button>
                <span className="w-6 text-center font-semibold tabular-nums">{c.qty[p.id]}</span>
                <button className="grid size-8 place-items-center rounded-lg hover:bg-white/10" onClick={() => c.setQty(p.id, c.qty[p.id] + 1)} aria-label="เพิ่ม">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {lines.length > 0 && (
          <footer className="space-y-4 border-t border-line px-5 py-4">
            {/* รูปแบบโค้ด */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1 text-sm">
              <button
                disabled={hasMulti}
                onClick={() => setMode("single")}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 font-semibold transition ${effMode === "single" ? "bg-white/10 text-fg" : "text-muted hover:text-fg"} disabled:opacity-40`}
              >
                <Ticket className="size-4" /> รวมเป็นโค้ดเดียว
              </button>
              <button
                onClick={() => setMode("split")}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 font-semibold transition ${effMode === "split" ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
              >
                <Gift className="size-4" /> แยกโค้ดทีละชิ้น
              </button>
            </div>
            <p className="-mt-2 text-xs text-dim">
              {effMode === "single" ? "กรอกครั้งเดียวได้ครบทุกชิ้น เหมาะกับใช้เอง" : "ได้โค้ดหลายใบ แจกเพื่อนได้คนละใบ"}
              {hasMulti && " • มีพาสที่ซื้อมากกว่า 1 เลยต้องแยกโค้ด"}
            </p>

            <div className="space-y-1.5 text-sm">
              <Row label="รวม Robux" value={`${formatNumber(c.totalRobux)} R$`} />
              <Row label={`÷ ${c.rate} แล้วปัดขึ้น`} value={`${(c.totalRobux / c.rate).toLocaleString("th-TH", { maximumFractionDigits: 2 })} → ${formatNumber(c.totalBaht)}`} />
              <Row label="จะได้โค้ด" value={`${codeCount} ใบ`} />
              {coupon && (
                <div className="flex items-center justify-between text-leaf">
                  <span className="flex items-center gap-1.5">
                    <TicketPercent className="size-4" /> คูปอง {coupon.code} ({coupon.label})
                  </span>
                  <span className="font-semibold tabular-nums">−฿{formatNumber(discount)}</span>
                </div>
              )}
              <div className="flex items-end justify-between pt-2">
                <span className="text-muted">ยอดชำระ</span>
                <span className="text-right">
                  {discount > 0 && <span className="mr-2 text-sm text-dim line-through">฿{formatNumber(c.totalBaht)}</span>}
                  <span className="text-gradient text-3xl font-extrabold">฿{formatNumber(payBaht)}</span>
                </span>
              </div>
            </div>

            {c.signedIn &&
              (coupon ? (
                <button onClick={() => setCoupon(null)} className="w-full text-right text-xs text-muted hover:text-fg">
                  เอาคูปองออก
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (couponText.trim()) applyCoupon(couponText);
                  }}
                  className="space-y-1"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TicketPercent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
                      <input
                        value={couponText}
                        onChange={(e) => setCouponText(e.target.value.toUpperCase())}
                        placeholder="มีโค้ดส่วนลด? กรอกตรงนี้"
                        className="input !py-2 !pl-9 text-sm uppercase"
                      />
                    </div>
                    <button disabled={checking || !couponText.trim()} className="btn btn-ghost !px-3 !py-2 text-sm">
                      {checking ? "..." : "ใช้"}
                    </button>
                  </div>
                  {couponMsg && <p className="text-xs text-danger">{couponMsg}</p>}
                  {c.myCoupons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="w-full text-[11px] text-dim">คูปองของคุณ — แตะเพื่อใช้</span>
                      {c.myCoupons.map((m) => (
                        <button
                          key={m.code}
                          type="button"
                          disabled={checking}
                          onClick={() => applyCoupon(m.code)}
                          className="chip cursor-pointer border-gold/40 bg-gold/10 text-gold transition hover:bg-gold/20"
                          title={m.code}
                        >
                          <TicketPercent className="size-3.5" /> {m.label}
                          {m.minBaht > 0 && <span className="text-[10px] text-gold/70">ขั้นต่ำ ฿{m.minBaht}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              ))}

            {c.signedIn && (
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted">
                  <Wallet className="size-4 text-gold" /> แต้มคงเหลือ
                </span>
                <span className={short > 0 ? "font-semibold text-danger" : "font-semibold text-gold"}>{formatBaht(c.points)}</span>
              </div>
            )}

            {err && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {err.text}
                {err.need ? ` ขาดอีก ${formatBaht(err.need)} แต้ม` : ""}
              </div>
            )}

            {!c.signedIn ? (
              <Link href="/login?next=/" onClick={() => c.setOpen(false)} className="btn btn-primary w-full !py-3.5 text-base">
                เข้าสู่ระบบเพื่อสั่งซื้อ
              </Link>
            ) : short > 0 ? (
              <Link href="/topup" onClick={() => c.setOpen(false)} className="btn btn-gold w-full !py-3.5 text-base">
                <Wallet className="size-5" /> เติมแต้มอีก {formatBaht(short)} เพื่อซื้อ
              </Link>
            ) : (
              <button onClick={checkout} disabled={pending} className="btn btn-primary w-full !py-3.5 text-base">
                <Sparkles className="size-5" />
                {pending ? "กำลังสั่งซื้อ..." : `ซื้อเลย ใช้ ${formatNumber(payBaht)} แต้ม`}
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
