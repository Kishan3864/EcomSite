"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Ticket,
  UserRound,
} from "lucide-react";
import { customer } from "@/data/marketing";
import { useStore } from "@/store/store";
import { cn, formatDate } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: UserRound, exact: true },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/returns", label: "Returns and refunds", icon: RotateCcw },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/offers", label: "Coupons", icon: Ticket },
];

export function AccountNav() {
  const pathname = usePathname();
  const { orders, wishlist, hydrated } = useStore();

  const counts: Record<string, number> = hydrated
    ? { "/account/orders": orders.length, "/wishlist": wishlist.length }
    : {};

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="peacock-surface p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-[15px] font-bold text-brand-950">
              {customer.avatarInitials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">{customer.name}</p>
              <p className="truncate text-[12px] text-white/60">{customer.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2.5 backdrop-blur">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                Membership
              </p>
              <p className="text-[13px] font-semibold text-gold-300">{customer.tier}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                Points
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-white">
                {customer.loyaltyPoints.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            Member since {formatDate(customer.memberSince, "short")}
          </p>
        </div>
      </div>

      <nav aria-label="Account" className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <ul className="divide-y divide-hairline">
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const count = counts[link.href] ?? 0;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[13.5px] transition-colors",
                    active
                      ? "bg-brand-50 font-semibold text-brand-800"
                      : "text-ink-700 hover:bg-ink-50",
                  )}
                >
                  <link.icon size={16} className={active ? "text-brand-700" : "text-ink-400"} />
                  <span className="flex-1">{link.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-600">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-3 text-[13.5px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-sale-600"
            >
              <LogOut size={16} className="text-ink-400" />
              Sign out
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
