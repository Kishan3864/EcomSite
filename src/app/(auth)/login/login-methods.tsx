"use client";

import { useState, type ReactNode } from "react";
import { Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile OTP or email and password — one form at a time, mobile first.
 *
 * The two choices are set as tabs under a single rule rather than as a pair of
 * pills in a tinted tray. A tray with a raised white pill inside it is the one
 * control on these screens that still looked like a bought component, and the
 * underline says the same thing with one line.
 */
export function LoginMethods({ phone, email }: { phone: ReactNode; email: ReactNode }) {
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const tabs = [
    { id: "phone" as const, label: "Mobile number", Icon: Smartphone },
    { id: "email" as const, label: "Email", Icon: Mail },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="mb-4 grid grid-cols-2 border-b border-hairline sm:mb-6"
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`login-tab-${id}`}
            aria-selected={method === id}
            aria-controls={`login-panel-${id}`}
            onClick={() => setMethod(id)}
            className={cn(
              "tap -mb-px inline-flex h-11 items-center justify-center gap-2 border-b-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 sm:text-[12px]",
              method === id
                ? "border-ink-950 text-ink-950"
                : "border-transparent text-ink-500 hover:text-ink-900",
            )}
          >
            <Icon size={15} className={method === id ? "text-ink-950" : "text-ink-400"} />
            {label}
          </button>
        ))}
      </div>
      {/* Both stay mounted, so switching back keeps what was typed. */}
      <div role="tabpanel" id="login-panel-phone" aria-labelledby="login-tab-phone" hidden={method !== "phone"}>
        {phone}
      </div>
      <div role="tabpanel" id="login-panel-email" aria-labelledby="login-tab-email" hidden={method !== "email"}>
        {email}
      </div>
    </div>
  );
}
