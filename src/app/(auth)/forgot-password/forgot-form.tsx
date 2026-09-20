"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, Send } from "lucide-react";
import { buttonClasses, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPasswordHelp } from "@/services/commerce";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { Form } from "@/components/ui/form";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-10 w-full" loading={pending}>
      <Send size={16} /> {pending ? "Sending…" : "Email me a reset link"}
    </Button>
  );
}

/**
 * Asks for a reset link.
 *
 * The confirmation below is deliberately non-committal about whether an account
 * exists — it says "if there is an account" and nothing more — because a form
 * that confirms an address is a way of finding out who shops here.
 */
export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordHelp, {});

  if (state.ok) {
    return (
      // An enter animation rather than a scroll reveal: the block replaces the
      // form in place after a submit, and `Reveal` would wait for an
      // intersection that has, in the awkward cases, already happened.
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="bg-surface p-4 sm:p-5"
      >
        <span className="eyebrow">Check your email</span>
        <h2 className="mt-3 font-display text-[22px] leading-[1.1] tracking-[-0.02em] text-ink-950">
          Check your inbox
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.55] text-ink-600">
          If there is an account for that address, a link is on its way. It works once and expires
          in an hour. Look in spam if it has not arrived in a few minutes.
        </p>
        <p className="mt-3 text-[13px] leading-[1.5] text-ink-500">
          In a hurry? Call{" "}
          <a
            href={`tel:${BRAND.supportPhoneTel}`}
            className="font-medium tabular-nums text-brand-700 hover:underline"
          >
            {BRAND.supportPhone}
          </a>
          . Support runs {BUSINESS.supportHours}.
        </p>
        <Link
          href="/login"
          className={buttonClasses("outline", "md", "mt-5 h-10 w-full sm:w-auto")}
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <Form action={action} className="space-y-4 sm:space-y-5">
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

      {/* A rule rather than a tinted tray: the sentence is an aside, not an
          alarm, and the shop draws asides with a line down the side. */}
      <p className="pl-3.5 text-[13px] leading-[1.55] text-ink-600">
        The link expires in an hour and can only be used once. If you normally sign in with Google,
        this is how you add a password as well — Google carries on working either way.
      </p>

      <SendButton />

      <Link
        href="/login"
        className="tap -my-2 inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-ink-600 transition-colors duration-200 hover:text-brand-700 sm:my-0 sm:py-0"
      >
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </Form>
  );
}
