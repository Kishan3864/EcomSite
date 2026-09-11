"use client";

import { useState, type ReactNode } from "react";
import { Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mobile OTP or email and password — one form at a time, mobile first. */
export function LoginMethods({ phone, email }: { phone: ReactNode; email: ReactNode }) {
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const tabs = [
    { id: "phone" as const, label: "Mobile number", Icon: Smartphone },
    { id: "email" as const, label: "Email", Icon: Mail },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Sign-in method" className="mb-4 grid grid-cols-2 border border-hairline bg-ink-50 p-1 sm:mb-6">
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
              "tap inline-flex h-10 items-center justify-center gap-2 text-[13px] font-semibold transition-colors sm:text-[13.5px]",
              method === id ? "bg-surface text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-800",
            )}
          >
            <Icon size={15} /> {label}
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
