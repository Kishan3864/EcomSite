import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { LoginMethods } from "./login-methods";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { PhoneOtpLogin } from "@/components/auth/phone-otp";
import { smsConfigured } from "@/lib/sms";
import { getCustomerSession } from "@/lib/auth/customer";
import { safeNextPath } from "@/lib/auth/oauth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to WeekendCart to track orders, save addresses and reorder in one tap.",
  alternates: { canonical: "/login" },
};

/**
 * Codes the OAuth callback sends back on `?error=`. Anything unrecognised —
 * including a code added after this map was written — gets the generic line.
 */
const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied: "That sign-in was cancelled before it finished.",
  oauth_state: "That sign-in attempt expired on the way back. Please try again.",
  oauth_email: "That account did not share an email address, so we cannot sign you in with it.",
  oauth_link: "There is already an account with that email address. Sign in with your email below.",
  oauth_other_provider:
    "That email already signs in with a different provider. Use the button you used before.",
  oauth_disabled: "That account is no longer active. Get in touch and we will look into it.",
};

const OAUTH_GENERIC = "We could not finish that sign-in. Please try again, or use your email and password.";

/** The code arrives off the query string, so an inherited key is not a match. */
function oauthMessage(code: string | string[] | undefined) {
  if (typeof code !== "string") return undefined;
  return Object.hasOwn(OAUTH_ERRORS, code) ? OAUTH_ERRORS[code] : OAUTH_GENERIC;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  // Already signed in? There is nothing to do here.
  const [session, params] = await Promise.all([getCustomerSession(), searchParams]);
  // A key repeated in the query string arrives as an array, not a string.
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "") || undefined;
  if (session) redirect(next ?? "/account");

  const oauthError = oauthMessage(params.error);
  // Offered only once an SMS provider is configured: a "we sent you a code"
  // screen that sends nothing would be worse than no option at all.
  const otp = smsConfigured();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your orders, saved addresses and wishlist."
      imageIndex={0}
      footer={
        <>
          New to WeekendCart?{" "}
          {/* Carries `next` across, so someone sent here from checkout lands
              back on checkout whichever of the two forms they end up using. */}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="font-semibold text-brand-700 hover:underline"
          >
            Create an account
          </Link>{" "}
          — it takes about thirty seconds.
        </>
      }
    >
      {oauthError && (
        <p
          role="alert"
          /* A rule down the side rather than a tinted box, so a failed sign-in
             reads the same way as every other notice on the site. */
          className="flex items-start gap-2.5 rule-l [--rule-color:var(--color-sale-600)] py-1 pl-3 text-[13px] leading-[1.5] text-sale-700"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {oauthError}
        </p>
      )}

      {otp ? (
        <>
          <LoginMethods phone={<PhoneOtpLogin next={next} />} email={<LoginForm next={next} />} />
          <SocialSignIn next={next} divider="or sign in with" />
        </>
      ) : (
        <>
          <LoginForm next={next} />
          <SocialSignIn next={next} divider="or sign in with" />
        </>
      )}
    </AuthShell>
  );
}
