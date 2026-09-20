"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { KeyRound } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { resetPassword } from "@/services/commerce";
import { Form } from "@/components/ui/form";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-10 w-full" loading={pending}>
      <KeyRound size={16} /> {pending ? "Saving…" : "Save new password"}
    </Button>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, {});

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="bg-surface p-4 sm:p-5"
      >
        <span className="eyebrow">Done</span>
        <h2 className="mt-3 font-display text-[22px] leading-[1.1] tracking-[-0.02em] text-ink-950">
          Your password is changed
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.55] text-ink-600">
          Sign in with the new one. The link you just used will not work again, and any other reset
          link we sent you has stopped working too.
        </p>
        <Link href="/login" className={`${buttonClasses("primary", "md")} mt-5`}>
          Go to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <Form action={action} className="bg-surface p-4 sm:p-5">
      <input type="hidden" name="token" value={token} />

      <Field label="New password" htmlFor="new-password" error={state.field === "password" ? state.error : undefined}>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          invalid={state.field === "password"}
          placeholder="At least 8 characters"
        />
      </Field>

      {/* An error with no field is about the link itself, not the password. */}
      {state.error && !state.field ? (
        <p className="mt-3 bg-gold-50 px-3.5 py-2.5 text-[13px] leading-[1.5] text-ink-800">
          {state.error}{" "}
          <Link href="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Ask for a new link
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-5">
        <SaveButton />
      </div>
    </Form>
  );
}
