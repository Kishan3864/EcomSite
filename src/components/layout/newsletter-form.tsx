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

/**
 * White rather than ember, even though this is the strongest thing on the
 * plane. The footer is on every page of the shop, and ember is spent on one
 * filled call to action per page — if the newsletter took it here, no page
 * could ever have its own. White on evergreen is the stronger fill in any case.
 */
function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[13.5px] font-semibold tracking-[0.005em] text-ink-950 transition-colors duration-200 hover:bg-ink-100 disabled:opacity-70"
    >
      {pending ? "Signing you up…" : "Subscribe"}
      <ArrowRight size={16} />
    </button>
  );
}

/**
 * Writes a real subscriber row, which the admin inbox lists and exports.
 * `welcomeEmail` says whether email is configured, so the thank-you line never
 * promises a welcome note the server cannot send.
 */
export function NewsletterForm({ welcomeEmail = false }: { welcomeEmail?: boolean }) {
  const [state, action] = useActionState(subscribe, {});

  if (state.ok) {
    return (
      <div className="w-full">
        <p className="flex items-center gap-2.5 border border-white/15 bg-white/5 px-4 py-3.5 text-[14px] leading-[1.5] text-white">
          <Check size={17} strokeWidth={1.5} className="shrink-0 text-gold-300" />
          {welcomeEmail
            ? "Thank you for subscribing! If you are new here, a welcome note is on its way to your inbox."
            : "Thank you for subscribing! You are on the list."}
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
          // flex-1 only from sm up. Below that the row stacks into a column,
          // and flex-1 there means a flex-basis of 0 on the vertical axis —
          // which is what squashed this input to a sliver on phones.
          // text-base on phones: iOS zooms the page into any input set smaller
          // than 16px the moment it is focused.
          className="h-12 w-full shrink-0 rounded-lg border border-white/20 bg-white/5 px-4 text-base text-white outline-none transition-colors duration-200 placeholder:text-white/45 focus:border-gold-400 focus:bg-white/10 sm:w-auto sm:flex-1 sm:text-[14px]"
        />
        <SubscribeButton />
      </div>
      {/* The message is set in white and marked by an ember rule rather than
          being written in ember itself: on this plane the only other gold is
          the subscribe button, and an error painted the same colour as the
          thing that caused it reads as part of the button. */}
      {state.error && (
        <p role="alert" className="mt-3 border-l-2 border-gold-400 pl-3 text-[13px] leading-[1.5] text-white">
          {state.error}
        </p>
      )}
      <p className="mt-3.5 text-[13px] leading-[1.5] text-white/55">
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
