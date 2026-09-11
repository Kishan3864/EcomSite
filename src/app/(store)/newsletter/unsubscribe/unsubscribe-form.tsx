"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck, MailMinus } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { unsubscribeFromNewsletter, type UnsubscribeState } from "@/services/newsletter";

const INITIAL: UnsubscribeState = {};

export function UnsubscribeForm({ email, e, t }: { email: string; e: string; t: string }) {
  const [state, action, pending] = useActionState(unsubscribeFromNewsletter, INITIAL);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  // The form is replaced by the confirmation, so move focus with it rather
  // than leaving keyboard and screen-reader users on a button that is gone.
  useEffect(() => {
    if (state.done) doneHeading.current?.focus();
  }, [state.done]);

  if (state.done) {
    return (
      <div>
        <span className="flex h-11 w-11 items-center justify-center bg-brand-50 text-brand-700">
          <MailCheck size={19} aria-hidden />
        </span>
        <p className="eyebrow mt-6">Unsubscribed</p>
        <h1
          ref={doneHeading}
          tabIndex={-1}
          className="mt-3 font-display text-[26px] leading-[1.12] tracking-[-0.02em] text-ink-950 outline-none sm:text-[32px]"
        >
          You have been unsubscribed
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">
          <strong className="break-all font-semibold text-ink-900">{email}</strong> will no longer
          receive WeekendCart newsletter emails. We are sorry to see you go, and thank you for the
          time you spent with us.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
          Changed your mind? You can subscribe again from the bottom of any page.
        </p>
        <div className="mt-8">
          <Link href="/" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
            Back to the store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="e" value={e} />
      <input type="hidden" name="t" value={t} />

      <span className="flex h-11 w-11 items-center justify-center bg-brand-50 text-brand-700">
        <MailMinus size={19} aria-hidden />
      </span>
      <p className="eyebrow mt-6">Email preferences</p>
      <h1 className="mt-3 font-display text-[26px] leading-[1.12] tracking-[-0.02em] text-ink-950 sm:text-[32px]">
        Unsubscribe <span className="break-all text-brand-700">{email}</span> from WeekendCart
        emails?
      </h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">
        You will stop receiving our newsletter at this address. It does not affect your account or
        any order you have placed with us.
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-6 flex gap-2.5 border-l-2 border-sale-600 bg-sale-50 px-4 py-3.5 text-[13px] leading-relaxed text-sale-700"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? "Unsubscribing" : "Yes, unsubscribe me"}
        </Button>
        <Link href="/" className={buttonClasses("outline", "lg", "w-full sm:w-auto")}>
          Keep me subscribed
        </Link>
      </div>
    </form>
  );
}
