"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  ChevronRight,
  Heart,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MegaMenu } from "./mega-menu";
import { SearchBar } from "./search-bar";
import type { SearchDoc } from "@/lib/search-index";
import type { Category } from "@/lib/types";
import { Drawer } from "@/components/ui/overlay";
import { offers } from "@/data/marketing";
import { useStore } from "@/store/store";
import { cartCount } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function HeaderClient({
  searchDocs,
  categories,
}: {
  searchDocs: SearchDoc[];
  categories: Category[];
}) {
  const [scrolled, setScrolled] = useState(false);
  // The drawers are keyed to the route they were opened on, so navigating
  // anywhere closes them without an effect chasing the pathname.
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const [searchOpenAt, setSearchOpenAt] = useState<string | null>(null);
  const pathname = usePathname();
  const { cart, wishlist, hydrated, openCartDrawer } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuOpen = menuOpenAt === pathname;
  const searchOpen = searchOpenAt === pathname;
  const count = hydrated ? cartCount(cart) : 0;
  const wishCount = hydrated ? wishlist.length : 0;

  return (
    <>
      <AnnouncementBar />

      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-canvas/85 backdrop-blur-xl transition-shadow duration-300",
          scrolled ? "border-hairline shadow-sm" : "border-transparent",
        )}
      >
        <div className="container-page">
          {/* ---------------------------- Desktop --------------------------- */}
          <div className="hidden items-center gap-6 py-3 lg:flex">
            <Logo />
            <div className="max-w-2xl flex-1">
              <SearchBar docs={searchDocs} />
            </div>
            <nav className="flex items-center gap-1" aria-label="Account and cart">
              <HeaderAction href="/account" icon={<User size={19} />} label="Account" sublabel="Sign in" />
              <HeaderAction
                href="/wishlist"
                icon={<Heart size={19} />}
                label="Wishlist"
                sublabel="Saved"
                count={wishCount}
              />
              <button
                onClick={openCartDrawer}
                className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-100"
              >
                <span className="relative">
                  <ShoppingBag size={19} className="text-ink-700" />
                  <CountBubble count={count} />
                </span>
                <span className="hidden xl:block">
                  <span className="block text-[10px] uppercase tracking-[0.1em] text-ink-400">
                    Your bag
                  </span>
                  <span className="block text-[13px] font-semibold text-ink-900">
                    {count > 0 ? `${count} item${count > 1 ? "s" : ""}` : "Empty"}
                  </span>
                </span>
              </button>
            </nav>
          </div>

          <div className="hidden border-t border-hairline lg:block">
            <div className="flex items-center justify-between py-1.5">
              <MegaMenu categories={categories} />
              <div className="flex items-center gap-4 text-[12.5px]">
                <Link
                  href="/track"
                  className="inline-flex items-center gap-1.5 text-ink-600 transition-colors hover:text-brand-700"
                >
                  <Package size={14} /> Track order
                </Link>
                <Link
                  href="/offers"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 transition-colors hover:text-brand-900"
                >
                  <Sparkles size={14} /> Today&rsquo;s offers
                </Link>
              </div>
            </div>
          </div>

          {/* ---------------------------- Mobile ---------------------------- */}
          <div className="flex items-center gap-2 py-2.5 lg:hidden">
            <button
              onClick={() => setMenuOpenAt(pathname)}
              aria-label="Open menu"
              className="-ml-1 rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100"
            >
              <Menu size={21} />
            </button>
            <Logo size="sm" className="mr-auto" />
            <button
              onClick={() => setSearchOpenAt(pathname)}
              aria-label="Search"
              className="rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100"
            >
              <Search size={20} />
            </button>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100"
            >
              <Heart size={20} />
              <CountBubble count={wishCount} />
            </Link>
            <button
              onClick={openCartDrawer}
              aria-label="Open bag"
              className="relative -mr-1 rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100"
            >
              <ShoppingBag size={20} />
              <CountBubble count={count} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpenAt(null)} categories={categories} />

      <Drawer
        open={searchOpen}
        onClose={() => setSearchOpenAt(null)}
        side="bottom"
        title="Search Mayura"
        className="max-h-[92vh]"
      >
        <div className="p-4">
          <SearchBar
            docs={searchDocs}
            variant="sheet"
            autoFocus
            onNavigate={() => setSearchOpenAt(null)}
          />
        </div>
      </Drawer>
    </>
  );
}

function CountBubble({ count }: { count: number }) {
  const reduce = usePrefersReducedMotion();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 560, damping: 20 }}
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sale-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function HeaderAction({
  href,
  icon,
  label,
  sublabel,
  count = 0,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-ink-100"
    >
      <span className="relative text-ink-700">
        {icon}
        <CountBubble count={count} />
      </span>
      <span className="hidden xl:block">
        <span className="block text-[10px] uppercase tracking-[0.1em] text-ink-400">
          {sublabel}
        </span>
        <span className="block text-[13px] font-semibold text-ink-900">{label}</span>
      </span>
    </Link>
  );
}

function AnnouncementBar() {
  const items = [
    "Free delivery on orders above ₹999",
    "Use MAYURA10 for 10% off your first order",
    "14-day easy returns, free pickup",
    "100% genuine, sourced direct from brands",
    `${offers.length} live offers today`,
  ];

  return (
    <div className="overflow-hidden bg-brand-950 py-2 text-white">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] motion-reduce:animate-none">
        {[0, 1].map((dup) => (
          <ul key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 whitespace-nowrap px-6 text-[11.5px] font-medium tracking-[0.02em] text-white/80"
              >
                <span className="h-1 w-1 rounded-full bg-gold-400" />
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { wishlist, orders, hydrated } = useStore();

  return (
    <Drawer open={open} onClose={onClose} side="left" className="max-w-[330px]">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <Logo size="sm" />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="-mr-1.5 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-hairline bg-brand-950 px-5 py-5 text-white">
        <p className="font-display text-lg tracking-[-0.01em]">Welcome back</p>
        <p className="mt-0.5 text-xs text-white/60">
          Sign in for faster checkout and order tracking.
        </p>
        <div className="mt-3.5 flex gap-2">
          <Link
            href="/login"
            className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-[13px] font-semibold text-ink-950"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="flex-1 rounded-lg border border-white/25 px-3 py-2 text-center text-[13px] font-semibold text-white"
          >
            Create account
          </Link>
        </div>
      </div>

      <nav className="p-3" aria-label="Mobile navigation">
        <p className="px-2 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          Shop by category
        </p>
        <ul>
          {categories.map((category) => (
            <li key={category.slug}>
              <button
                onClick={() =>
                  setExpanded((s) => (s === category.slug ? null : category.slug))
                }
                aria-expanded={expanded === category.slug}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-ink-50"
              >
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-ink-100">
                  <Image src={category.image.url} alt="" fill sizes="36px" className="object-cover" />
                </span>
                <span className="flex-1 text-sm font-medium text-ink-900">{category.name}</span>
                <ChevronRight
                  size={16}
                  className={cn(
                    "text-ink-400 transition-transform duration-200",
                    expanded === category.slug && "rotate-90",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded === category.slug && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden pl-12"
                  >
                    <li>
                      <Link
                        href={`/c/${category.slug}`}
                        onClick={onClose}
                        className="block rounded-md px-2 py-2 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        All {category.name}
                      </Link>
                    </li>
                    {category.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${category.slug}/${sub.slug}`}
                          onClick={onClose}
                          className="block rounded-md px-2 py-2 text-[13px] text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>

        <p className="px-2 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          Your account
        </p>
        <ul className="space-y-0.5">
          {[
            { href: "/offers", label: "Offers and deals" },
            { href: "/account/orders", label: `My orders${hydrated && orders.length ? ` (${orders.length})` : ""}` },
            { href: "/wishlist", label: `Wishlist${hydrated && wishlist.length ? ` (${wishlist.length})` : ""}` },
            { href: "/track", label: "Track an order" },
            { href: "/account/returns", label: "Returns" },
            { href: "/contact", label: "Contact us" },
            { href: "/faq", label: "Help and FAQ" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="block rounded-lg px-2 py-2.5 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-950"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Drawer>
  );
}
