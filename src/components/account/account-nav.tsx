"use client";

import { TierBlock, isTierName } from "./tier";
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

/**
 * The account's own masthead and index.
 *
 * The list is ruled rather than pilled. A column of soft tinted lozenges is the
 * house style of every dashboard template on the internet, and it also has to
 * shout to show which one is current; a plain index with a single heavy rule
 * against the live row says it once, quietly, and matches the way the shop
 * lists departments on the homepage.
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

  // One shape for a link and for the sign-out button, so the last row of the
  // index sits on exactly the same measure as the six above it.
  // Pills on a phone (a swipeable tab row), rounded rows in a card from lg.
  const row =
    "tap flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors duration-200 lg:h-11 lg:gap-3 lg:whitespace-normal lg:rounded-lg lg:px-3.5 lg:text-[13.5px]";

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className={cn("deep-plane overflow-hidden rounded-2xl p-4 lg:p-5", !home && "hidden lg:block")}>
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatarUrl}
            seed={profile?.email ?? ""}
            size={48}
            className="ring-1 ring-white/20"
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">
              {profile?.name}
            </p>
            <p className="truncate text-[13px] text-white/60">{profile?.email}</p>
          </div>
        </div>

        {/* The tier as a crest with its name and the points — the shared
            component, so the account panel cannot drift from anywhere else a
            tier is ever shown. An unknown tier name falls back to plain text. */}
        {profile && isTierName(profile.tier) ? (
          <TierBlock tier={profile.tier} points={profile.loyaltyPoints} onDark className="mt-4 pt-3.5" />
        ) : (
          <p className="mt-4 pt-3.5 text-[13.5px] font-semibold text-white">{profile?.tier}</p>
        )}

        <p className="mt-3 text-[13px] text-white/40">
          Member since {profile ? formatDate(profile.memberSince, "short") : "—"}
        </p>
      </div>

      {/* A scrolling tab row below lg, the ruled index from lg up. */}
      <nav
        aria-label="Account"
        className="lg:rounded-xl lg:border lg:bg-surface lg:p-1.5 lg:shadow-card"
      >
        <ul
          ref={tabs}
          className="no-scrollbar flex gap-1.5 overflow-x-auto overscroll-x-contain lg:block lg:space-y-0.5 lg:overflow-visible"
        >
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const count = counts[link.href] ?? 0;

            return (
              <li
                key={link.href}
                className="shrink-0"
              >
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    row,
                    active
                      ? "bg-brand-700 font-semibold text-white lg:bg-brand-50 lg:text-brand-800"
                      : "border bg-surface text-ink-600 hover:bg-ink-50 hover:text-ink-950 lg:border-0 lg:bg-transparent",
                  )}
                >
                  <link.icon size={16} className={active ? "text-current" : "text-ink-400"} />
                  <span className="flex-1">{link.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-600">
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
                className={cn(
                  row,
                  "w-full border bg-surface text-left text-ink-500 hover:bg-sale-50 hover:text-sale-600 lg:border-0 lg:bg-transparent",
                )}
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
