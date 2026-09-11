"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Ticket,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cn, formatDate } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Avatar } from "@/components/account/avatar";

const LINKS = [
  { href: "/account", label: "Overview", icon: UserRound, exact: true },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/returns", label: "Returns and refunds", icon: RotateCcw },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/offers", label: "Coupons", icon: Ticket },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export interface AccountProfile {
  name: string;
  email: string;
  tier: string;
  loyaltyPoints: number;
  memberSince: string;
  avatarInitials: string;
  avatarUrl: string | null;
}

export function AccountNav({
  profile,
  orderCount,
}: {
  profile: AccountProfile | null;
  orderCount: number;
}) {
  const pathname = usePathname();
  const { wishlist, hydrated } = useStore();
  const tabs = useRef<HTMLUListElement>(null);

  const counts: Record<string, number> = {
    "/account/orders": orderCount,
    "/wishlist": hydrated ? wishlist.length : 0,
  };

  // Below lg the links are a sideways tab row, and the later tabs start off
  // screen on a phone. Centre the current one when it is not fully in view.
  useEffect(() => {
    const row = tabs.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    const rowBox = row.getBoundingClientRect();
    const box = current.getBoundingClientRect();
    if (box.left >= rowBox.left && box.right <= rowBox.right) return;
    row.scrollLeft += box.left - rowBox.left - (rowBox.width - box.width) / 2;
  }, [pathname]);

  // On a phone the profile card is the account home's header, as in an app;
  // the sub-pages carry their own title, so it would only push them down.
  const home = pathname === "/account";

  return (
    <div className="space-y-3 lg:space-y-4">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-hairline bg-surface",
          !home && "hidden lg:block",
        )}
      >
        <div className="peacock-surface p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile?.avatarUrl}
              seed={profile?.email ?? ""}
              size={48}
              className="ring-2 ring-white/20"
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">
                {profile?.name}
              </p>
              <p className="truncate text-[11.5px] text-white/60 sm:text-[12px]">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 backdrop-blur lg:mt-4 lg:py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                Membership
              </p>
              <p className="text-[13px] font-semibold text-gold-300">{profile?.tier}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                Points
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-white">
                {(profile?.loyaltyPoints ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-white/40 lg:mt-3">
            Member since {profile ? formatDate(profile.memberSince, "short") : "—"}
          </p>
        </div>
      </div>

      {/* A scrolling tab row below lg, the sidebar list from lg up. */}
      <nav aria-label="Account" className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <ul
          ref={tabs}
          className="no-scrollbar flex overflow-x-auto overscroll-x-contain lg:block lg:divide-y lg:divide-hairline lg:overflow-visible"
        >
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const count = counts[link.href] ?? 0;

            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-[13px] transition-colors",
                    "lg:h-auto lg:gap-3 lg:whitespace-normal lg:border-b-0 lg:px-4 lg:py-3 lg:text-[13.5px]",
                    active
                      ? "border-brand-700 bg-brand-50 font-semibold text-brand-800"
                      : "border-transparent text-ink-700 hover:bg-ink-50",
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
          <li className="shrink-0">
            <Form action={logoutAction}>
              <button
                type="submit"
                className="tap flex h-11 w-full items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3.5 text-left text-[13px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-sale-600 lg:h-auto lg:gap-3 lg:whitespace-normal lg:border-b-0 lg:px-4 lg:py-3 lg:text-[13.5px]"
              >
                <LogOut size={16} className="text-ink-400" />
                Sign out
              </button>
            </Form>
          </li>
        </ul>
      </nav>
    </div>
  );
}
