import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCustomerSession } from "@/lib/auth/customer";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Mayura to track orders, save addresses and reorder in one tap.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in? There is nothing to do here.
  const [session, params] = await Promise.all([getCustomerSession(), searchParams]);
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : undefined;
  if (session) redirect(next ?? "/account");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your orders, saved addresses and wishlist."
      imageIndex={6}
      footer={
        <>
          New to Mayura?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>{" "}
          — it takes about thirty seconds.
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
