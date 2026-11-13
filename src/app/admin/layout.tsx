import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "หลังบ้าน" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
