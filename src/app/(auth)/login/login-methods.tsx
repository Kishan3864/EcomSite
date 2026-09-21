"use client";

import { useState, type ReactNode } from "react";
import { Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile OTP or email and password — one form at a time, mobile first.
 *
 * The two choices are a segmented control: one tray, the active tab raised.
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
        className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-ink-100 p-1 sm:mb-5"
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
              "tap inline-flex h-9 items-center justify-center gap-2 rounded-[9px] text-[12.5px] font-semibold transition-[background-color,color,box-shadow] duration-200",
              method === id
                ? "bg-surface text-ink-950 shadow-sm"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            <Icon size={16} aria-hidden className={method === id ? "text-brand-700" : "text-ink-500"} />
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
