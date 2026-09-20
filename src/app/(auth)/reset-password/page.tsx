import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { findResetToken } from "@/lib/auth/password-reset";
import { ResetForm } from "./reset-form";

/**
 * Where a password reset link lands.
 *
 * The token is checked before the form is drawn, so somebody arriving with a
 * dead link is told why straight away rather than typing a new password twice
 * and only then being refused. Checking is not spending: the ticket is only
 * used when the form is submitted.
 */
export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DEAD: Record<string, { title: string; body: string }> = {
  expired: {
    title: "That link has expired",
    body: "Reset links last an hour. Ask for a new one and it will be with you in a moment.",
  },
  used: {
    title: "That link has already been used",
    body: "Each link works once. If you still need to change your password, ask for a new one.",
  },
  unknown: {
    title: "That link is not valid",
    body: "It may have been cut short by your email app. Ask for a new one and open the newest email.",
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";
  const found = token ? await findResetToken(token) : ({ ok: false, reason: "unknown" } as const);

  if (!found.ok) {
    const copy = DEAD[found.reason] ?? DEAD.unknown;
    return (
      <div className="mx-auto w-full max-w-[420px] px-4 py-12">
        <h1 className="font-display text-[26px] leading-tight tracking-[-0.02em] text-ink-950">
          {copy.title}
        </h1>
        <p className="mt-3 text-[14px] leading-[1.65] text-ink-600">{copy.body}</p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/forgot-password" className={buttonClasses("primary", "md")}>
            Ask for a new link
          </Link>
          <Link href="/login" className={buttonClasses("outline", "md")}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // An account that has only ever used Google is setting a first password, not
  // replacing one. Saying "reset" to that person asks them to recall something
  // they never chose.
  const setting = !found.hasPassword;

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 py-12">
      <h1 className="font-display text-[26px] leading-tight tracking-[-0.02em] text-ink-950">
        {setting ? "Set a password for your account" : "Set a new password"}
      </h1>
      <p className="mt-3 text-[14px] leading-[1.65] text-ink-600">
        {setting
          ? "You sign in with Google at the moment. Add a password and you can use either — the Google button keeps working exactly as it does now."
          : "Choose something you have not used elsewhere. This link works once."}
      </p>
      <div className="mt-6">
        <ResetForm token={token} setting={setting} />
      </div>
    </div>
  );
}
