import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Mayura to track orders, save addresses and reorder in one tap.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
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
      <LoginForm />
    </AuthShell>
  );
}
