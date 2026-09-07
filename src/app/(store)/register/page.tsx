import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Mayura account for faster checkout, order tracking and early access to limited runs.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for orders, returns, addresses and early access to limited runs."
      imageIndex={3}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in instead
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
