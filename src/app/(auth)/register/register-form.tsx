"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { AlertTriangle, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { registerAction } from "@/services/commerce";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

/** Matches the block the shared `Form` draws for a failed constraint. */
const ERROR_BLOCK =
  "flex items-start gap-2 rounded-md bg-sale-50 px-3.5 py-3 text-[13px] leading-[1.5] text-sale-700 ring-1 ring-inset ring-sale-200";

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

/**
 * The meter fills with ink, not with a traffic light.
 *
 * It used to run rose, gold, ocean — which spent two of the three
 * colours the shop reserves for something else entirely: gold marks the one
 * action worth taking on a page, and rose means a price has come down.
 * Neither is a comment on a password. Graphite darkening into ocean says
 * "stronger" just as plainly and leaves the signals intact.
 */
const TONES = ["bg-ink-200", "bg-ink-400", "bg-ink-500", "bg-brand-500", "bg-brand-700"];

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-10 w-full" loading={pending}>
      <Check size={17} /> {pending ? "Creating your account…" : "Create my account"}
    </Button>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, {});
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const score = strength(password);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <Form action={action} className="space-y-4 sm:space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && !state.field && (
        <p role="alert" className={ERROR_BLOCK}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Field label="Full name" htmlFor="reg-name" error={err("name")}>
        <Input
          id="reg-name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name ?? ""}
          invalid={state.field === "name"}
          placeholder="Ananya Iyer"
        />
      </Field>

      <Field label="Email address" htmlFor="reg-email" error={err("email")}>
        <Input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? ""}
          invalid={state.field === "email"}
          placeholder="you@example.in"
        />
      </Field>

      <Field label="Mobile number" htmlFor="reg-phone" error={err("phone")}>
        <Input
          id="reg-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={state.values?.phone ?? ""}
          invalid={state.field === "phone"}
          placeholder="+91 98450 12345"
        />
      </Field>

      <Field label="Password" htmlFor="reg-password" error={err("password")}>
        <div className="relative">
          <Input
            id="reg-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            invalid={state.field === "password"}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            // 40px square on a phone, the minimum comfortable tap; from sm up
            // it shrinks back to the icon and its padding.
            className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink-400 transition-colors duration-200 hover:text-ink-900 sm:right-1.5 sm:h-auto sm:w-auto sm:p-2"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      {password && (
        <div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                initial={false}
                animate={{ opacity: i < score ? 1 : 0.25 }}
                className={cn("h-[3px] flex-1 rounded-full", i < score ? TONES[score] : "bg-ink-200")}
              />
            ))}
          </div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink-500">
            Password strength:{" "}
            <strong className="font-semibold text-ink-900">{LABELS[score]}</strong> — mix in a
            capital letter, a number and a symbol.
          </p>
        </div>
      )}

      {/* Required, so the browser blocks the submit rather than a round trip. */}
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-ink-600">
        <input
          type="checkbox"
          name="terms"
          required
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-700)]"
        />
        <span>
          I agree to the{" "}
          <Link href="/legal/terms" className="font-medium text-brand-700 hover:underline">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </label>

      <CreateButton />
    </Form>
  );
}
