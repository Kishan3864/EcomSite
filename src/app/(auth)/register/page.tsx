import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { getCustomerSession } from "@/lib/auth/customer";
import { safeNextPath } from "@/lib/auth/oauth";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Mayura account for faster checkout, order tracking and early access to limited runs.",
  alternates: { canonical: "/register" },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([getCustomerSession(), searchParams]);
  // A key repeated in the query string arrives as an array, not a string.
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "") || undefined;
  if (session) redirect(next ?? "/account");

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for orders, returns, addresses and early access to limited runs."
      imageIndex={1}
      footer={
        <>
          Already have an account?{" "}
          {/* Carries `next` across, so someone sent here from checkout lands
              back on checkout whichever of the two forms they end up using. */}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-semibold text-brand-700 hover:underline"
          >
            Sign in instead
          </Link>
        </>
      }
    >
      <SocialSignIn next={next} />
      <RegisterForm next={next} />
    </AuthShell>
  );
}
