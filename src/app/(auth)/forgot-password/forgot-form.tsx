"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
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
        className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-inset ring-brand-100 sm:p-5"
      >
        <span className="icon-tile bg-surface">
          <MailCheck size={20} aria-hidden />
        </span>
        <p className="t-label mt-4 text-brand-700">Check your email</p>
        <h2 className="t-h2 mt-1.5">Check your inbox</h2>
        <p className="t-body mt-2">
          If there is an account for that address, a link is on its way. It works once and expires
          in an hour. Look in spam if it has not arrived in a few minutes.
        </p>
        <p className="t-small mt-3">
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

      {/* An aside, set as a quiet inset note. */}
      <p className="t-small rounded-md bg-ink-50 px-3.5 py-3 ring-1 ring-inset ring-line">
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
