"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction } from "@/services/commerce";
import { Form } from "@/components/ui/form";

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {pending ? "Signing you in…" : "Sign in"}
    </Button>
  );
}

/**
 * Email and password only. There is no SMS provider wired up, so no OTP tab —
 * a "we sent you a code" screen that sends nothing would be worse than none.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && !state.field && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-sale-200 bg-sale-50 px-3.5 py-2.5 text-[13px] text-sale-700"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Field
        label="Email address"
        htmlFor="login-email"
        error={state.field === "email" ? state.error : undefined}
      >
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? ""}
          invalid={state.field === "email"}
          placeholder="you@example.in"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="login-password"
        error={state.field === "password" ? state.error : undefined}
      >
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            invalid={state.field === "password"}
            placeholder="••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-end">
        <Link
          href="/forgot-password"
          className="text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <SignInButton />
    </Form>
  );
}
