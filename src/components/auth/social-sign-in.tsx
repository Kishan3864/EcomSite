import Link from "next/link";
import type { ReactElement } from "react";
import { configuredProviders, type ProviderId } from "@/lib/auth/oauth";
import { GoogleButton, GooglePrompt } from "@/components/auth/google-identity";
import { GoogleMark } from "@/components/brand/payment-marks";

/**
 * Brand marks, drawn inline — the shared social icons file has no login marks.
 *
 * Google's G now lives in brand/payment-marks.tsx, because the checkout needs
 * the same mark beside "Google Pay" and one trademark should not exist twice in
 * one codebase at two slightly different vintages. Facebook stays here: nothing
 * else in the shop draws it.
 */
const MARKS: Record<ProviderId, () => ReactElement> = {
  google: () => <GoogleMark size={18} />,
  facebook: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877f2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.5c-1.48 0-1.94.92-1.94 1.87v2.25h3.3l-.53 3.49h-2.77V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  ),
};

/**
 * The provider buttons, shown beneath the form rather than above it.
 *
 * Google draws its own button and caps it at 400px wide and 40px tall, and
 * nothing can change that. With the providers at the top of the page, that
 * button sat a whole form away from the one that submits it, and the two never
 * looked like a pair. Below the form they are adjacent, at the same width and
 * the same height, so they read as two ways of doing one thing.
 *
 * Renders nothing at all until credentials are configured, so the store never
 * shows a sign-in route that cannot complete.
 */
export function SocialSignIn({
  next,
  divider = "or continue with",
}: {
  next?: string;
  divider?: string;
}) {
  const providers = configuredProviders();
  if (providers.length === 0) return null;

  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div>
      <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        <span className="h-px flex-1 bg-hairline" />
        {divider}
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <div className="mt-4 space-y-2">
        {providers.map(({ id, label }) => {
          const Mark = MARKS[id];
          const start = `/api/auth/${id}/start${query}`;

          // Google's own button takes the click and hands us a signed token,
          // so signing in needs nothing of this server's connection to Google.
          // See GoogleButton. Facebook has no equivalent, and keeps the link.
          if (id === "google") {
            return (
              <GoogleButton key={id} next={next} href={start}>
                <Mark />
                Continue with {label}
              </GoogleButton>
            );
          }

          return (
            // A plain anchor: next/link would prefetch the route on hover and
            // start a handshake nobody asked for.
            <a
              key={id}
              href={start}
              // 40px and square, the same as Google's own button beside it and
              // the same as the submit button above.
              className="tap flex h-10 w-full items-center justify-center gap-3 bg-ink-950 px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800 sm:px-6"
            >
              <Mark />
              Continue with {label}
            </a>
          );
        })}
      </div>

      {/* Google's One Tap prompt, which offers "Continue as <name>" in the
          browser's corner when the browser is signed in to Google. */}
      {providers.some((provider) => provider.id === "google") ? <GooglePrompt next={next} /> : null}

      {/* The email form takes consent with a checkbox; a provider sign-up skips
          that form entirely, so the acknowledgement has to sit with the buttons. */}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        Continuing with a provider means you accept our{" "}
        <Link href="/legal/terms" className="text-ink-600 underline underline-offset-2 hover:text-brand-700">
          terms of service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-ink-600 underline underline-offset-2 hover:text-brand-700">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
