import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Reset the password on your Mayura account.",
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we will send you a secure reset link."
      imageIndex={1}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
