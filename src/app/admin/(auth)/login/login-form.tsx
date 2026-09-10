"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton, Notice } from "@/components/admin/client";
import { loginAdminAction } from "@/services/admin/auth-actions";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { Form } from "@/components/ui/form";

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAdminAction, INITIAL_FORM);
  const [show, setShow] = useState(false);

  return (
    <Form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <Field label="Work email" htmlFor="admin-email">
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@weekendcart.com"
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="admin-password">
        <div className="relative">
          <Input
            id="admin-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </Form>
  );
}
