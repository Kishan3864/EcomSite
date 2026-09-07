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

export function BottomNav() {
  const pathname = usePathname();
  const { cart, wishlist, hydrated } = useStore();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const counts: Record<string, number> = hydrated
    ? { "/cart": cartCount(cart), "/wishlist": wishlist.length }
    : {};

  return (
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
                className="relative flex flex-col items-center gap-1 py-2.5"
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
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale-500 px-1 text-[9.5px] font-bold leading-none text-white tabular-nums">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] font-medium transition-colors duration-200",
                    active ? "text-brand-800" : "text-ink-500",
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
  );
}
