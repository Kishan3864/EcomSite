"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
      setError("Enter the email address on your account.");
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 900);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border border-brand-200 bg-brand-50 p-6"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
          <MailCheck size={20} />
        </span>
        <h2 className="mt-4 font-display text-xl tracking-[-0.015em] text-ink-950">
          Check your inbox
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">
          If an account exists for <strong className="text-ink-950">{email}</strong>, we have sent a
          reset link. It expires in 30 minutes.
        </p>
        <p className="mt-3 text-[12.5px] text-ink-600">
          Nothing arrived? Check spam, or{" "}
          <button
            onClick={() => setSent(false)}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            try a different address
          </button>
          .
        </p>
        <Link href="/login" className={buttonClasses("outline", "md", "mt-5")}>
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field
        label="Email address"
        htmlFor="forgot-email"
        error={error ?? undefined}
        hint="We will send a secure link to reset your password."
      >
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          invalid={Boolean(error)}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.in"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        <Send size={16} /> Send reset link
      </Button>

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </form>
  );
}
