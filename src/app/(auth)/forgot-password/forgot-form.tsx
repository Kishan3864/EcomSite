"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, Headset, Send } from "lucide-react";
import { buttonClasses, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPasswordHelp } from "@/services/commerce";
import { BRAND } from "@/components/brand/logo";
import { Form } from "@/components/ui/form";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      <Send size={16} /> {pending ? "Sending…" : "Ask support to reset it"}
    </Button>
  );
}

/**
 * No automated reset email exists yet, so this raises a support request rather
 * than claiming to have sent a link nobody would receive.
 */
export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordHelp, {});

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border border-brand-200 bg-brand-50 p-6"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Headset size={20} />
        </span>
        <h2 className="mt-4 font-display text-xl tracking-[-0.015em] text-ink-950">
          Our team will get back to you
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">
          If there is an account for that address, your request is with support now. They will
          verify who you are and set a new password with you, usually within a few working hours.
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">
          In a hurry? Call{" "}
          <a href={`tel:${BRAND.supportPhone}`} className="font-semibold text-brand-700 hover:underline">
            {BRAND.supportPhone}
          </a>{" "}
          between 8am and 10pm, any day.
        </p>
        <Link href="/login" className={buttonClasses("outline", "md", "mt-5")}>
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <Form action={action} className="space-y-5">
      <Field
        label="Email address"
        htmlFor="forgot-email"
        error={state.error}
        hint="We will match it to your account and have support reset the password with you."
      >
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? ""}
          invalid={Boolean(state.error)}
          placeholder="you@example.in"
        />
      </Field>

      <p className="rounded-lg bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-600">
        Automatic reset emails are not switched on yet, so a person handles this rather than a
        link landing in your inbox.
      </p>

      <SendButton />

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </Form>
  );
}
