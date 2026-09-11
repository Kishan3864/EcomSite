import Link from "next/link";
import type { ReactElement } from "react";
import { configuredProviders, type ProviderId } from "@/lib/auth/oauth";
import { GooglePrompt } from "@/components/auth/google-identity";

/** Brand marks, drawn inline — the shared social icons file has no login marks. */
const MARKS: Record<ProviderId, () => ReactElement> = {
  google: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#fbbc05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </svg>
  ),
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
 * The provider buttons, and the divider that introduces the email form below
 * them. Renders nothing at all until credentials are configured, so the store
 * never shows a sign-in route that cannot complete.
 */
export function SocialSignIn({ next }: { next?: string }) {
  const providers = configuredProviders();
  if (providers.length === 0) return null;

  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="mb-7">
      <div className="space-y-2.5">
        {providers.map(({ id, label }) => {
          const Mark = MARKS[id];
          return (
            // A plain anchor: next/link would prefetch the route on hover and
            // start a handshake nobody asked for.
            <a
              key={id}
              href={`/api/auth/${id}/start${query}`}
              // Exactly the Sign in button's box — full width, 48px, the same
              // square corner — so the two read as one set of controls.
              className="flex h-12 w-full items-center justify-center gap-3 border border-ink-300 bg-surface px-6 text-[14px] font-semibold tracking-[-0.01em] text-ink-900 transition-colors duration-200 hover:border-ink-950 hover:bg-ink-50 active:bg-ink-100"
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
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
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

      <div className="mt-6 flex items-center gap-3 text-[12px] text-ink-400">
        <span className="h-px flex-1 bg-hairline" />
        or continue with email
        <span className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
