"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/settings", label: "Store", owner: true },
  { href: "/admin/settings/shipping", label: "Shipping", owner: true },
  { href: "/admin/settings/payments", label: "Payments", owner: true },
  { href: "/admin/settings/tax", label: "Tax", owner: true },
  { href: "/admin/settings/inventory", label: "Inventory", owner: true },
  { href: "/admin/settings/team", label: "Team", owner: true },
  { href: "/admin/settings/profile", label: "Your account", owner: false },
];

export function SettingsTabs({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => isOwner || !t.owner);

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
              active
                ? "border-brand-800 text-ink-950"
                : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
