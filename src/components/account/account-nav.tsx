"use client";

import { TierChip, isTierName } from "./tier";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cn, formatDate } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Avatar } from "@/components/account/avatar";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Active only on this exact path. */
  exact?: boolean;
  /** Never marked active (a link into a section of another page). */
  anchor?: boolean;
}

const LINKS: NavLink[] = [
  { href: "/account", label: "My account", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/track", label: "Track order", icon: Truck },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/settings#payment", label: "Payment preferences", icon: CreditCard, anchor: true },
  { href: "/account/returns", label: "Returns & refunds", icon: RotateCcw },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/contact", label: "Help & support", icon: LifeBuoy },
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

/**
 * The account's profile header and index: a sidebar card from lg, and a
 * swipeable chip row below it (the profile card shows on the account home only).
 */
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

  // Below lg, scroll the current chip into view when it starts off screen.
  useEffect(() => {
    const row = tabs.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    const rowBox = row.getBoundingClientRect();
    const box = current.getBoundingClientRect();
    if (box.left >= rowBox.left && box.right <= rowBox.right) return;
    row.scrollLeft += box.left - rowBox.left - (rowBox.width - box.width) / 2;
  }, [pathname]);

  const home = pathname === "/account";

  const item =
    "group flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium ring-1 ring-inset transition-colors duration-200 " +
    "lg:h-10 lg:gap-3 lg:rounded-md lg:px-3 lg:text-[13.5px] lg:ring-0";

  return (
    <div className="space-y-3 lg:space-y-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:shadow-card">
      {/* Profile header */}
      <div className={cn("card relative overflow-hidden p-4 lg:rounded-none lg:border-0 lg:shadow-none lg:p-5", !home && "hidden lg:block")}>
        <div aria-hidden className="aurora pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex items-center gap-3">
          <Avatar
            src={profile?.avatarUrl}
            seed={profile?.email ?? ""}
            size={52}
            className="ring-2 ring-surface shadow-sm"
          />
          <div className="min-w-0">
            <p className="t-h3 truncate">{profile?.name}</p>
            <p className="t-small truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="relative mt-3.5 flex flex-wrap items-center gap-2">
          {profile && isTierName(profile.tier) ? (
            <TierChip tier={profile.tier} />
          ) : profile?.tier ? (
            <span className="inline-flex h-7 items-center rounded-full bg-surface px-2.5 text-[12px] font-semibold text-ink-800 ring-1 ring-inset ring-line">
              {profile.tier}
            </span>
          ) : null}
          {profile && profile.loyaltyPoints > 0 && (
            <span className="inline-flex h-7 items-center rounded-full bg-surface px-2.5 text-[12px] font-semibold tabular-nums text-ink-800 ring-1 ring-inset ring-line">
              {profile.loyaltyPoints.toLocaleString("en-IN")} points
            </span>
          )}
        </div>
        <p className="t-small relative mt-2.5">
          Member since {profile ? formatDate(profile.memberSince, "short") : "—"}
        </p>
      </div>

      <nav aria-label="Account" className="lg:border-t lg:border-line lg:p-2">
        <ul
          ref={tabs}
          className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto overscroll-x-contain px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0"
        >
          {LINKS.map((link) => {
            const active = link.anchor
              ? false
              : link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
            const count = counts[link.href] ?? 0;

            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    item,
                    active
                      ? "bg-brand-700 text-white ring-brand-700 lg:bg-brand-50 lg:font-semibold lg:text-brand-800"
                      : "bg-surface text-ink-700 ring-line-strong hover:bg-ink-50 hover:text-ink-950 lg:bg-transparent",
                  )}
                >
                  <link.icon
                    size={16}
                    aria-hidden
                    className={cn(active ? "text-current lg:text-brand-700" : "text-ink-500 group-hover:text-ink-700")}
                  />
                  <span className="lg:flex-1">{link.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums",
                        active ? "bg-white/20 text-current lg:bg-brand-100" : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {count}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    aria-hidden
                    className={cn("hidden text-ink-400 lg:block", active ? "lg:text-brand-700" : "opacity-0 group-hover:opacity-100")}
                  />
                </Link>
              </li>
            );
          })}
          <li className="shrink-0 lg:mt-1 lg:border-t lg:border-line lg:pt-1">
            <Form action={logoutAction}>
              <button
                type="submit"
                className={cn(
                  item,
                  "w-full bg-surface text-left text-ink-600 ring-line-strong hover:bg-sale-50 hover:text-sale-700 lg:bg-transparent",
                )}
              >
                <LogOut size={16} aria-hidden className="text-ink-500 group-hover:text-sale-600" />
                Sign out
              </button>
            </Form>
          </li>
        </ul>
      </nav>
    </div>
  );
}
