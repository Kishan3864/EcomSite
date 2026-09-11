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

/** Email and password. Mobile OTP sits beside it (see login-methods.tsx). */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="space-y-4 sm:space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && !state.field && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-sale-200 bg-sale-50 px-3 py-2 text-[12.5px] text-sale-700 sm:px-3.5 sm:py-2.5 sm:text-[13px]"
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
            // 40px square on a phone, the minimum comfortable tap; from sm up
            // it shrinks back to the icon and its padding.
            className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 sm:right-1.5 sm:h-auto sm:w-auto sm:p-2"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-end">
        <Link
          href="/forgot-password"
          className="-my-2 py-2 text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:my-0 sm:py-0"
        >
          Forgot password?
        </Link>
      </div>

      <SignInButton />
    </Form>
  );
}
