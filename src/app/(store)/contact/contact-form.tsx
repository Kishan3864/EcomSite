"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Send } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { submitContact } from "@/services/commerce";
import { Form } from "@/components/ui/form";

const TOPICS = [
  "Where is my order?",
  "Return or exchange",
  "Refund not received",
  "Product question",
  "Damaged or wrong item",
  "Bulk or corporate order",
  "I make things and want to sell here",
  "Something else",
];

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: TOPICS[0],
    orderNumber: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email))
      next.email = "We need a valid email to reply to.";
    if (form.message.trim().length < 10)
      next.message = "A sentence or two helps us answer properly.";

    setErrors(next);
    if (Object.keys(next).length) return;

    // Lands in the admin inbox, where support answers it.
    startTransition(async () => {
      const result = await submitContact({
        name: form.name,
        email: form.email,
        topic: form.topic,
        orderNumber: form.orderNumber || undefined,
        message: form.message,
      });
      if (!result.ok) {
        setErrors({ message: result.error });
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-brand-200 bg-brand-50 p-8"
      >
        <CheckCircle2 size={36} className="text-brand-600" />
        <h2 className="mt-4 font-display text-2xl tracking-[-0.02em] text-ink-950">
          Message received
        </h2>
        <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-ink-700">
          Thanks {form.name.split(" ")[0]} — we have your message about{" "}
          <strong className="text-ink-950">{form.topic.toLowerCase()}</strong> and will reply to{" "}
          <strong className="text-ink-950">{form.email}</strong>. Expect an answer within a few
          minutes during working hours.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/products" className={buttonClasses("primary", "md")}>
            Keep shopping
          </Link>
          <button
            onClick={() => {
              setSent(false);
              setForm((f) => ({ ...f, message: "", orderNumber: "" }));
            }}
            className={buttonClasses("outline", "md")}
          >
            Send another message
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <Form onSubmit={submit} className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
      <h2 className="font-display text-2xl tracking-[-0.02em] text-ink-950">Send us a message</h2>
      <p className="mt-2 text-[13.5px] text-ink-600">
        The more specific you are, the faster we can fix it. Include an order number if you have
        one.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" error={errors.name}>
          <Input
            id="c-name"
            autoComplete="name"
            value={form.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ananya Iyer"
          />
        </Field>

        <Field label="Email address" htmlFor="c-email" error={errors.email}>
          <Input
            id="c-email"
            type="email"
            autoComplete="email"
            value={form.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.in"
          />
        </Field>

        <Field label="What is this about?" htmlFor="c-topic">
          <Select
            id="c-topic"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Order number" htmlFor="c-order" optional>
          <Input
            id="c-order"
            value={form.orderNumber}
            onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
            placeholder="WKC-2026-005001"
          />
        </Field>

        <Field label="Message" htmlFor="c-message" error={errors.message} className="sm:col-span-2">
          <textarea
            id="c-message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us what happened…"
            className={`w-full rounded-lg border bg-canvas px-3.5 py-3 text-[14px] leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 ${
              errors.message
                ? "border-sale-500 focus:border-sale-600"
                : "border-ink-200 hover:border-ink-300 focus:border-brand-500"
            }`}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-sm text-[11.5px] leading-relaxed text-ink-400">
          We use what you send only to answer you. See our{" "}
          <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <Button type="submit" size="lg" loading={pending}>
          <Send size={16} /> Send message
        </Button>
      </div>
    </Form>
  );
}
