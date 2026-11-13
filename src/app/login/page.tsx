import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(safe);
  return <AuthForm kind="login" next={safe} />;
}
