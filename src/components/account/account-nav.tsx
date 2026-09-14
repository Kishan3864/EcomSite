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
  const row =
    "tap flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-[13px] transition-colors duration-200 lg:h-12 lg:gap-3 lg:whitespace-normal lg:border-b-0 lg:border-l-2 lg:px-4 lg:text-[13.5px]";

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className={cn("deep-plane p-4 lg:p-5", !home && "hidden lg:block")}>
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

        {/* Two figures on one rule, rather than a frosted panel inside a
            panel. The numerals are tabular so the points column does not
            shift as it grows. */}
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-3.5">
          <div className="min-w-0">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Membership
            </dt>
            <dd className="mt-1 truncate text-[13.5px] font-semibold text-white">
              {profile?.tier}
            </dd>
          </div>
          <div className="min-w-0 text-right">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Points
            </dt>
            <dd className="mt-1 text-[13.5px] font-semibold tabular-nums text-white">
              {(profile?.loyaltyPoints ?? 0).toLocaleString("en-IN")}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[13px] text-white/40">
          Member since {profile ? formatDate(profile.memberSince, "short") : "—"}
        </p>
      </div>

      {/* A scrolling tab row below lg, the ruled index from lg up. */}
      <nav
        aria-label="Account"
        className="border-b border-hairline lg:border lg:border-hairline lg:bg-surface"
      >
        <ul
          ref={tabs}
          className="no-scrollbar flex overflow-x-auto overscroll-x-contain lg:block lg:overflow-visible"
        >
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const count = counts[link.href] ?? 0;

            return (
              <li
                key={link.href}
                className="shrink-0 lg:border-t lg:border-hairline lg:first:border-t-0"
              >
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    row,
                    "-mb-px lg:mb-0",
                    active
                      ? "border-ink-950 font-semibold text-ink-950"
                      : "border-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-950",
                  )}
                >
                  <link.icon size={16} className={active ? "text-ink-950" : "text-ink-400"} />
                  <span className="flex-1">{link.label}</span>
                  {count > 0 && (
                    <span className="text-[11.5px] font-semibold tabular-nums text-ink-500">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="shrink-0 lg:border-t lg:border-hairline">
            <Form action={logoutAction}>
              <button
                type="submit"
                className={cn(
                  row,
                  "-mb-px w-full border-transparent text-left text-ink-500 hover:bg-ink-50 hover:text-sale-600 lg:mb-0",
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
