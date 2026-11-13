import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "หลังบ้าน" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.slips).where(eq(schema.slips.status, "pending"));
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AdminNav pendingSlips={n} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
