import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Noto_Serif_Thai, Prompt } from "next/font/google";
import { CartProvider } from "@/components/cart";
import { listBonusTiers } from "@/lib/bonus";
import { Nav } from "@/components/nav";
import { PushBanner } from "@/components/push-banner";
import { PwaProvider } from "@/components/pwa";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { vapidPublicKey } from "@/lib/notify";
import { listMyCoupons } from "@/lib/coupons";
import { getCurrentUser } from "@/lib/auth";
import { listOnSale } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// หัวข้อ: ฟอนต์ไทยมีเชิง ให้ความรู้สึกพรีเมียม
const serif = Noto_Serif_Thai({
  variable: "--font-serif",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "เหนื่อยใจ Pass Shop", template: "%s · เหนื่อยใจ Pass Shop" },
  description: "ซื้อพาสแมพเหนื่อยใจ เติมด้วยซองอั่งเปาหรือพร้อมเพย์ ได้โค้ดทันที",
  applicationName: "เหนื่อยใจ",
  appleWebApp: { capable: true, title: "เหนื่อยใจ", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0a0908", viewportFit: "cover" };

async function unreadCount(userId: number) {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return n;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, products, st, bonusTiers] = await Promise.all([getCurrentUser(), listOnSale(), getSettings(), listBonusTiers().catch(() => [])]);
  const [unread, myCoupons] = user ? await Promise.all([unreadCount(user.id), listMyCoupons(user.id)]) : [0, []];
  const navUser = user ? { name: user.displayName, points: user.points, admin: user.role === "admin", unread } : null;

  return (
    <html lang="th">
      <body className={`${prompt.variable} ${serif.variable} font-sans`}>
        <div className="aurora">
          <i />
        </div>
        <PwaProvider userId={user?.id ?? null}>
        <CartProvider products={products} rate={st.robuxPerBaht} signedIn={!!user} points={user?.points ?? 0} myCoupons={myCoupons.filter((c) => c.kind === "discount")} bonusTiers={bonusTiers}>
          <Nav user={navUser} vapidKey={vapidPublicKey()} />
          {st.announcement && (
            <div className="border-b border-line bg-gradient-to-r from-transparent via-amber-200/10 to-transparent px-4 py-2 text-center text-sm text-champagne">
              {st.announcement}
            </div>
          )}
          <main className="overflow-x-clip pb-28 lg:pb-12">{children}</main>
          <footer className="mx-auto hidden max-w-6xl px-4 pb-12 lg:block">
            <div className="gold-rule mb-6" />
            <div className="flex items-center justify-between text-xs tracking-wide text-dim">
              <span>© {new Date().getFullYear()} เหนื่อยใจ</span>
              <Link href="/install" className="text-gold/80 hover:text-gold">
                ติดตั้งแอป
              </Link>
            </div>
          </footer>
        </CartProvider>
        {user && <PushBanner />}
        </PwaProvider>
      </body>
    </html>
  );
}
