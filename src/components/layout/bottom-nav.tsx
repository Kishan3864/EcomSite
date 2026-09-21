"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Heart, House, LayoutGrid, ShoppingBag, UserRound } from "lucide-react";
import { useStore } from "@/store/store";
import { cartCount } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/products",
    label: "Shop",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/products") || p.startsWith("/c/") || p.startsWith("/search"),
  },
  { href: "/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { href: "/cart", label: "Bag", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  { href: "/account", label: "Account", icon: UserRound, match: (p: string) => p.startsWith("/account") },
];

/** Hidden inside the checkout funnel so nothing competes with the pay button. */
const HIDDEN_ON = ["/checkout", "/login", "/register", "/forgot-password"];

/** The checkout funnel and sign-in pages, where the phone chrome steps back. */
export function isFunnelRoute(pathname: string) {
  return HIDDEN_ON.some((p) => pathname.startsWith(p));
}

/**
 * The bar is 61px plus the home-indicator inset: 60px tabs and a 1px rule. The
 * sticky buy bar and the toasts sit on top of exactly that, so keep them in
 * step if it ever changes.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { cart, wishlist, unavailable, hydrated } = useStore();

  if (isFunnelRoute(pathname)) return null;

  const counts: Record<string, number> = hydrated
    ? { "/cart": cartCount(cart.filter((l) => !unavailable.includes(l.productId))), "/wishlist": wishlist.length }
    : {};

  return (
    <>
      {/* The bar floats over the page, so it keeps its own height free at the
          foot of the document; otherwise the footer's last row sits under it. */}
      <div aria-hidden className="h-[calc(61px+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label="Primary"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-[60px] grid-cols-5">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const count = counts[item.href] ?? 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="tap relative flex h-full flex-col items-center justify-center gap-1"
                >
                  <span className="relative flex h-7 w-12 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-active"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-brand-50 ring-1 ring-inset ring-brand-100"
                      />
                    )}
                    <Icon
                      size={20}
                      className={cn(
                        "relative transition-colors duration-200",
                        active ? "text-brand-700" : "text-ink-500",
                      )}
                    />
                    {count > 0 && (
                      <span className="count-dot !right-0.5 !top-[-4px]">{count > 9 ? "9+" : count}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] leading-none transition-colors duration-200",
                      active ? "font-semibold text-brand-800" : "font-medium text-ink-500",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
