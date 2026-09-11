"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  completePhoneSignup,
  requestLinkOtp,
  requestLoginOtp,
  verifyLinkOtp,
  verifyLoginOtp,
  type OtpRequestState,
} from "@/services/phone-auth";

/* ------------------------------------------------------------- pieces */

function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-sale-200 bg-sale-50 px-3 py-2 text-[12.5px] text-sale-700 sm:px-3.5 sm:py-2.5 sm:text-[13px]"
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

/** Ten digits after a fixed +91. */
function MobileInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      {/* Sized with the field's own text — 16px on phones, 14px from sm up —
          so the prefix and the digits sit on one line. The field's left padding
          grows with it on phones so the larger +91 keeps clear of the digits. */}
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-ink-700 sm:text-[14px]">
        +91
      </span>
      <Input
        id={id}
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10})/, "").slice(0, 10))}
        invalid={invalid}
        placeholder="98765 43210"
        className="pl-[3.25rem] tracking-[0.04em] sm:pl-12"
      />
    </div>
  );
}

/** One field for all six digits, so iOS and Android can fill it from the SMS. */
function CodeInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      id={id}
      name="otp"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      required
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      invalid={invalid}
      placeholder="••••••"
      className="text-center text-[22px] font-semibold tabular-nums tracking-[0.55em] sm:text-[20px]"
    />
  );
}

/**
 * Android Chrome's WebOTP: reads the code straight from the SMS once the user
 * taps Allow. It only works because the approved template ends with the line
 * "@weekendcart.com #<code>". Elsewhere, autocomplete="one-time-code" does it.
 */
function useSmsAutofill(active: boolean, onCode: (code: string) => void) {
  const handler = useRef(onCode);
  useEffect(() => {
    handler.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const abort = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: abort.signal } as CredentialRequestOptions)
      .then((credential) => {
        const code = (credential as unknown as { code?: string } | null)?.code;
        if (code && /^\d{6}$/.test(code)) handler.current(code);
      })
      .catch(() => {
        // Dismissed, timed out or aborted: the field still works by hand.
      });
    return () => abort.abort();
  }, [active]);
}

/** Seconds until "Resend" comes back. */
function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return {
    left: Math.max(0, Math.ceil((until - now) / 1000)),
    start: (seconds: number) => {
      setNow(Date.now());
      setUntil(Date.now() + seconds * 1000);
    },
  };
}

/**
 * The phone and code steps, shared by sign-in and by "add your number" in
 * settings. `verify` returns an error message, or null once the code passed.
 */
function OtpSteps({
  idPrefix,
  request,
  verify,
  submitLabel,
  footnote,
}: {
  idPrefix: string;
  request: (phone: string) => Promise<OtpRequestState>;
  verify: (phone: string, code: string) => Promise<string | null>;
  submitLabel: string;
  footnote?: ReactNode;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [display, setDisplay] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const countdown = useCountdown();

  const send = () => {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    startTransition(async () => {
      const result = await request(phone);
      if (result.ok) {
        setDisplay(result.phone);
        setCode("");
        setStep("code");
        countdown.start(result.resendIn);
      } else {
        setError(result.error);
        if (result.retryIn) countdown.start(result.retryIn);
      }
    });
  };

  // Typing the sixth digit and the SMS autofill can both submit; only one may.
  const checking = useRef(false);
  const check = useCallback(
    (value: string) => {
      if (checking.current) return;
      if (value.length !== 6) {
        setError("Enter the 6-digit code from the SMS.");
        return;
      }
      checking.current = true;
      setError(null);
      startTransition(async () => {
        try {
          const problem = await verify(phone, value);
          if (problem) setError(problem);
        } finally {
          checking.current = false;
        }
      });
    },
    [phone, verify],
  );

  useSmsAutofill(step === "code", (value) => {
    setCode(value);
    check(value);
  });

  if (step === "phone") {
    return (
      <form
        className="space-y-4 sm:space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        noValidate
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Mobile number"
          htmlFor={`${idPrefix}-phone`}
          hint="We will send a 6-digit code by SMS from WeekendCart."
        >
          <MobileInput id={`${idPrefix}-phone`} value={phone} onChange={setPhone} invalid={Boolean(error)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={countdown.left > 0}>
          {pending ? "Sending code…" : countdown.left > 0 ? `Try again in ${countdown.left}s` : "Get OTP"}
        </Button>
        {footnote}
      </form>
    );
  }

  return (
    <form
      className="space-y-4 sm:space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        check(code);
      }}
      noValidate
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] leading-relaxed text-ink-600 sm:text-[13.5px]">
          Enter the code sent to <strong className="font-semibold text-ink-900">{display}</strong>
        </p>
        {/* The padding only widens the tap area on a phone; the margin cancels it. */}
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
          }}
          className="-m-2 inline-flex shrink-0 items-center gap-1 p-2 text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:m-0 sm:p-0"
        >
          <ArrowLeft size={13} /> Change
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <Field label="One-time code" htmlFor={`${idPrefix}-otp`}>
        <CodeInput
          id={`${idPrefix}-otp`}
          value={code}
          invalid={Boolean(error)}
          onChange={(value) => {
            setCode(value);
            if (value.length === 6) check(value);
          }}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Checking…" : submitLabel}
      </Button>

      <p className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-500 sm:text-[12.5px]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-brand-600" /> Never share this code with anyone.
        </span>
        {countdown.left > 0 ? (
          <span className="tabular-nums">Resend in {countdown.left}s</span>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="-my-2 py-2 font-semibold text-brand-700 underline-offset-4 hover:underline disabled:opacity-50 sm:my-0 sm:py-0"
          >
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}

/* -------------------------------------------------------------- sign in */

export function PhoneOtpLogin({ next }: { next?: string }) {
  const [needsProfile, setNeedsProfile] = useState(false);

  const verify = useCallback(
    async (phone: string, code: string) => {
      const result = await verifyLoginOtp(phone, code, next);
      // A known number is redirected by the server and never gets here.
      if (!result) return null;
      if (result.ok) {
        setNeedsProfile(true);
        return null;
      }
      return result.error;
    },
    [next],
  );

  if (needsProfile) return <PhoneProfileStep next={next} />;

  return (
    <OtpSteps
      idPrefix="login"
      request={requestLoginOtp}
      verify={verify}
      submitLabel="Verify and continue"
      footnote={
        <p className="text-[11.5px] leading-relaxed text-ink-400">
          By continuing you accept our{" "}
          <Link href="/legal/terms" className="text-ink-600 underline underline-offset-2 hover:text-brand-700">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-ink-600 underline underline-offset-2 hover:text-brand-700">
            privacy policy
          </Link>
          .
        </p>
      }
    />
  );
}

/** First time with this number: the two things an order needs. */
function PhoneProfileStep({ next }: { next?: string }) {
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 sm:space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await completePhoneSignup(
            { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? "") },
            next,
          );
          if (result?.error) setError({ message: result.error, field: result.field });
        });
      }}
    >
      <p className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-[12.5px] text-brand-800 sm:px-3.5 sm:py-2.5 sm:text-[13px]">
        <Check size={14} className="mt-0.5 shrink-0" />
        Number verified. Tell us who you are to finish creating your account.
      </p>
      {error && !error.field && <Alert>{error.message}</Alert>}
      <Field label="Full name" htmlFor="otp-name" error={error?.field === "name" ? error.message : undefined}>
        <Input id="otp-name" name="name" autoComplete="name" required invalid={error?.field === "name"} autoFocus />
      </Field>
      <Field
        label="Email address"
        htmlFor="otp-email"
        hint="For order confirmations and invoices."
        error={error?.field === "email" ? error.message : undefined}
      >
        <Input
          id="otp-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={error?.field === "email"}
          placeholder="you@example.in"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Creating your account…" : "Create my account"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------- settings */

/** "Mobile number for sign-in" in account settings. */
export function PhoneLinkCard({ verifiedPhone }: { verifiedPhone: string | null }) {
  const [linked, setLinked] = useState(verifiedPhone);
  const [editing, setEditing] = useState(false);

  const verify = useCallback(async (phone: string, code: string) => {
    const result = await verifyLinkOtp(phone, code);
    if (!result.ok) return result.error;
    setLinked(result.phone);
    setEditing(false);
    return null;
  }, []);

  if (linked && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* On a phone the note wraps under the number instead of squeezing it
            onto two lines. */}
        <p className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] text-ink-800 sm:flex-nowrap sm:gap-2 sm:text-[14px]">
          <ShieldCheck size={16} className="shrink-0 text-brand-600" />
          <span className="whitespace-nowrap font-semibold">{linked}</span>
          <span className="text-[12px] text-ink-500">Verified — you can sign in with an OTP</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          className="h-10 sm:h-9"
        >
          Change number
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <OtpSteps idPrefix="link" request={requestLinkOtp} verify={verify} submitLabel="Verify number" />
    </div>
  );
}
