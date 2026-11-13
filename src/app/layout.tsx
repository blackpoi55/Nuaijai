import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import { CartProvider } from "@/components/cart";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { listOnSale } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "เหนื่อยใจ Pass Shop", template: "%s · เหนื่อยใจ Pass Shop" },
  description: "ซื้อพาสแมพเหนื่อยใจ เติมด้วยซองอั่งเปา ได้โค้ดทันที",
};

export const viewport: Viewport = { themeColor: "#070912" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, products, st] = await Promise.all([getCurrentUser(), listOnSale(), getSettings()]);
  const navUser = user ? { name: user.displayName, points: user.points, admin: user.role === "admin" } : null;

  return (
    <html lang="th">
      <body className={`${prompt.variable} font-sans`}>
        <div className="aurora">
          <i />
        </div>
        <div className="grid-bg" />
        <CartProvider products={products} rate={st.robuxPerBaht} signedIn={!!user} points={user?.points ?? 0}>
          <Nav user={navUser} />
          {st.announcement && (
            <div className="border-b border-line bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-violet-500/15 px-4 py-2 text-center text-sm font-medium">
              {st.announcement}
            </div>
          )}
          <main className="overflow-x-clip pb-28 md:pb-12">{children}</main>
          <footer className="mx-auto hidden max-w-6xl px-4 pb-10 text-center text-xs text-dim md:block">
            © {new Date().getFullYear()} เหนื่อยใจ · ราคา = Robux ÷ {st.robuxPerBaht} ปัดขึ้น · เติมด้วยซองอั่งเปา TrueMoney
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
