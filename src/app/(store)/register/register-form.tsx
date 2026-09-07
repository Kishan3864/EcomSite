"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const TONES = ["bg-ink-200", "bg-sale-500", "bg-gold-400", "bg-brand-400", "bg-brand-600"];

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const score = useMemo(() => strength(form.password), [form.password]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email))
      next.email = "Enter a valid email address.";
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      next.phone = "Enter a 10-digit Indian mobile number.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (!accepted) next.terms = "Please accept the terms to continue.";

    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Account created",
        description: `Welcome to Mayura, ${form.name.split(" ")[0]}.`,
      });
      router.push("/account");
    }, 950);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Full name" htmlFor="reg-name" error={errors.name}>
        <Input
          id="reg-name"
          autoComplete="name"
          value={form.name}
          invalid={Boolean(errors.name)}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ananya Iyer"
        />
      </Field>

      <Field label="Email address" htmlFor="reg-email" error={errors.email}>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={form.email}
          invalid={Boolean(errors.email)}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@example.in"
        />
      </Field>

      <Field label="Mobile number" htmlFor="reg-phone" error={errors.phone}>
        <Input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          invalid={Boolean(errors.phone)}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="+91 98450 12345"
        />
      </Field>

      <Field label="Password" htmlFor="reg-password" error={errors.password}>
        <div className="relative">
          <Input
            id="reg-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            invalid={Boolean(errors.password)}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 8 characters"
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

      {form.password && (
        <div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                initial={false}
                animate={{ opacity: i < score ? 1 : 0.25 }}
                className={cn("h-1 flex-1 rounded-full", i < score ? TONES[score] : "bg-ink-200")}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-500">
            Password strength: <strong className="text-ink-800">{LABELS[score]}</strong> — mix in a
            capital letter, a number and a symbol.
          </p>
        </div>
      )}

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setErrors((x) => ({ ...x, terms: "" }));
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-700)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" className="font-semibold text-brand-700 hover:underline">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="font-semibold text-brand-700 hover:underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-[12px] text-sale-600">{errors.terms}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        <Check size={17} /> Create my account
      </Button>
    </form>
  );
}
