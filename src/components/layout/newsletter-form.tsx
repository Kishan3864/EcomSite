"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Mail } from "lucide-react";
import { subscribeNewsletter } from "@/services/commerce";
import { Form } from "@/components/ui/form";

interface State {
  ok?: boolean;
  error?: string;
}

async function subscribe(_prev: State, formData: FormData): Promise<State> {
  const result = await subscribeNewsletter(String(formData.get("email") ?? ""), "footer");
  return result.ok ? { ok: true } : { error: result.error };
}

/** White, not gold: gold is spent on one CTA per page and the footer is on all of them. */
function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-5 text-[13.5px] font-semibold text-ink-950 transition-colors duration-200 hover:bg-brand-50 disabled:opacity-70"
    >
      {pending ? "Signing you up…" : "Subscribe"}
      <ArrowRight size={16} aria-hidden />
    </button>
  );
}

/**
 * Writes a real subscriber row. `welcomeEmail` says whether mail is configured,
 * so the thank-you never promises a note the server cannot send.
 */
export function NewsletterForm({ welcomeEmail = false }: { welcomeEmail?: boolean }) {
  const [state, action] = useActionState(subscribe, {});

  if (state.ok) {
    return (
      <div className="w-full">
        <p className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-4 py-3.5 text-[13.5px] leading-[1.5] text-white ring-1 ring-inset ring-white/10">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gold-400 text-ink-950">
            <Check size={16} aria-hidden />
          </span>
          {welcomeEmail
            ? "Thank you for subscribing! If you are new here, a welcome note is on its way to your inbox."
            : "Thank you for subscribing! You are on the list."}
        </p>
      </div>
    );
  }

  return (
    <Form action={action} className="w-full">
      <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.06] p-2 ring-1 ring-inset ring-white/10 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <div className="relative w-full sm:flex-1">
          <Mail
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50"
          />
          {/* text-base on phones: iOS zooms into inputs under 16px. Utilities
              beat the base-layer field style, so it stays transparent. */}
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="you@example.in"
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "newsletter-error" : undefined}
            className="h-12 w-full rounded-md bg-transparent pl-10 pr-3 text-base text-white shadow-none outline-none placeholder:text-white/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-inset focus:ring-brand-300/70 sm:text-[14px]"
          />
        </div>
        <SubscribeButton />
      </div>
      {state.error && (
        <p
          id="newsletter-error"
          role="alert"
          className="mt-3 border-l-2 border-gold-400 pl-3 text-[13px] leading-[1.5] text-white"
        >
          {state.error}
        </p>
      )}
      <p className="mt-3 text-[12.5px] leading-[1.5] text-white/55">
        By subscribing you agree to our{" "}
        <Link
          href="/legal/privacy"
          className="underline decoration-white/30 underline-offset-2 transition-colors duration-200 hover:text-white hover:decoration-white/70"
        >
          privacy policy
        </Link>
        .
      </p>
    </Form>
  );
}
