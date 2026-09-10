"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check } from "lucide-react";
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

function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-70"
    >
      {pending ? "Signing you up…" : "Subscribe"}
      <ArrowRight size={16} />
    </button>
  );
}

/** Writes a real subscriber row, which the admin inbox lists and exports. */
export function NewsletterForm() {
  const [state, action] = useActionState(subscribe, {});

  if (state.ok) {
    return (
      <div className="w-full">
        <p className="flex items-center gap-2.5 rounded-xl border border-gold-400/40 bg-white/10 px-4 py-3.5 text-sm text-white">
          <Check size={17} className="shrink-0 text-gold-300" />
          You are on the list. The next Dispatch goes out on Thursday.
        </p>
      </div>
    );
  }

  return (
    <Form action={action} className="w-full">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@example.in"
          aria-invalid={Boolean(state.error)}
          className="h-12 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-gold-400 focus:bg-white/10"
        />
        <SubscribeButton />
      </div>
      {state.error && (
        <p role="alert" className="mt-2.5 text-[12px] text-gold-300">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-[11.5px] text-white/40">
        By subscribing you agree to our{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-white/70">
          privacy policy
        </Link>
        .
      </p>
    </Form>
  );
}
