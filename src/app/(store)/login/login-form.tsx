"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { customer } from "@/data/marketing";
import { cn } from "@/lib/utils";

type Mode = "password" | "otp";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", phone: "", otp: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

    if (mode === "password") {
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email))
        next.email = "Enter a valid email address.";
      if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    } else if (!otpSent) {
      if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
        next.phone = "Enter a 10-digit Indian mobile number.";
    } else if (form.otp.length !== 6) {
      next.otp = "Enter the 6-digit code we sent you.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    if (mode === "otp" && !otpSent) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setOtpSent(true);
        toast({
          title: "Code sent",
          description: `We texted a 6-digit code to ${form.phone}. Use 123456 for this demo.`,
          tone: "info",
        });
      }, 800);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Signed in", description: `Welcome back, ${customer.name.split(" ")[0]}.` });
      router.push("/account");
    }, 900);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1">
        {(["password", "otp"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setErrors({});
              setOtpSent(false);
            }}
            className={cn(
              "relative rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              mode === m ? "text-ink-950" : "text-ink-500 hover:text-ink-800",
            )}
          >
            {mode === m && (
              <motion.span
                layoutId="login-tab"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-md bg-surface shadow-sm"
              />
            )}
            <span className="relative">{m === "password" ? "Email" : "Mobile OTP"}</span>
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <>
          <Field label="Email address" htmlFor="login-email" error={errors.email}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={form.email}
              invalid={Boolean(errors.email)}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.in"
            />
          </Field>

          <Field label="Password" htmlFor="login-password" error={errors.password}>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                invalid={Boolean(errors.password)}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-600">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-700)]" />
              Keep me signed in
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </>
      ) : (
        <>
          <Field
            label="Mobile number"
            htmlFor="login-phone"
            error={errors.phone}
            hint="We will text you a 6-digit code."
          >
            <Input
              id="login-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              invalid={Boolean(errors.phone)}
              disabled={otpSent}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98450 12345"
            />
          </Field>

          {otpSent && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Field
                label="Enter the code"
                htmlFor="login-otp"
                error={errors.otp}
                hint="Demo code: 123456"
              >
                <Input
                  id="login-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={form.otp}
                  invalid={Boolean(errors.otp)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                  }
                  placeholder="123456"
                  className="tracking-[0.4em]"
                />
              </Field>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="mt-2 text-[12.5px] font-medium text-brand-700 hover:underline"
              >
                Change number
              </button>
            </motion.div>
          )}
        </>
      )}

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {mode === "otp" && !otpSent ? (
          <>
            <Smartphone size={17} /> Send code
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
