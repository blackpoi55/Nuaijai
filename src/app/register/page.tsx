import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(safe);
  return <AuthForm kind="register" next={safe} />;
}
