"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useStore } from "@/store/store";
import { cartCount } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/products",
    label: "Shop",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/products") || p.startsWith("/c/") || p.startsWith("/search"),
  },
  { href: "/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { href: "/cart", label: "Bag", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
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
  const { cart, wishlist, hydrated } = useStore();

  if (isFunnelRoute(pathname)) return null;

  const counts: Record<string, number> = hydrated
    ? { "/cart": cartCount(cart), "/wishlist": wishlist.length }
    : {};

  return (
    <>
      {/* The bar floats over the page, so it keeps its own height free at the
          foot of the document; otherwise the footer's last row sits under it. */}
      <div aria-hidden className="h-[calc(61px+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const count = counts[item.href] ?? 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="tap relative flex h-[60px] flex-col items-center justify-center gap-1"
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-700"
                    />
                  )}
                  <span className="relative">
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.2 : 1.7}
                      className={cn(
                        "transition-colors duration-200",
                        active ? "text-brand-800" : "text-ink-500",
                      )}
                    />
                    {count > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] transition-colors duration-200",
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
