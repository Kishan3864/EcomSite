"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  BadgePercent,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Flame,
  Heart,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Package,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  UserPlus,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MegaMenu } from "./mega-menu";
import { SearchBar } from "./search-bar";
import { isFunnelRoute } from "./bottom-nav";
import type { SearchDoc } from "@/lib/search-index";
import type { Category } from "@/lib/types";
import { Drawer } from "@/components/ui/overlay";
import { logoutAction } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cartCount } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { BUSINESS } from "@/config/business";
import { Avatar } from "@/components/account/avatar";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Everything the account owns, in the order a shopper is likely to want it. */
const ACCOUNT_LINKS: NavLink[] = [
  { href: "/account", label: "My account", icon: UserRound },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/track", label: "Track order", icon: Truck },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/settings#payment", label: "Payment preferences", icon: CreditCard },
  { href: "/account/returns", label: "Returns & refunds", icon: RotateCcw },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/contact", label: "Help & support", icon: LifeBuoy },
];

const GUEST_LINKS: NavLink[] = [
  { href: "/track", label: "Track order", icon: Truck },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/contact", label: "Help & support", icon: LifeBuoy },
];

/** Shortcuts into the ranked shelves; the same destinations the home page links to. */
const QUICK_LINKS: NavLink[] = [
  { href: "/products?sort=newest", label: "New arrivals", icon: Sparkles },
  { href: "/products?sort=popularity", label: "Best sellers", icon: Flame },
  { href: "/products?discount=25&sort=discount", label: "Deals", icon: BadgePercent },
];

export function HeaderClient({
  searchDocs,
  categories,
}: {
  searchDocs: SearchDoc[];
  categories: Category[];
}) {
  const [scrolled, setScrolled] = useState(false);
  // Drawers are keyed to the route they were opened on, so navigating
  // anywhere closes them without an effect chasing the pathname.
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const [searchOpenAt, setSearchOpenAt] = useState<string | null>(null);
  const pathname = usePathname();
  const { cart, wishlist, unavailable, hydrated, openCartDrawer } = useStore();

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      const s = window.scrollY > 24;
      setScrolled(s);
      // Sticky elements further down read --header-h, which follows this.
      if (s) root.dataset.scrolled = "";
      else delete root.dataset.scrolled;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete root.dataset.scrolled;
    };
  }, []);

  const menuOpen = menuOpenAt === pathname;
  const searchOpen = searchOpenAt === pathname;
  const lines = hydrated ? cart.filter((l) => !unavailable.includes(l.productId)) : [];
  const count = cartCount(lines);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const wishCount = hydrated ? wishlist.length : 0;

  return (
    <>
      <AnnouncementBar />

      <header
        className={cn(
          "glass sticky top-0 z-50 border-b transition-[box-shadow,border-color] duration-300",
          scrolled ? "border-line shadow-[0_8px_24px_-18px_rgb(10_15_26/0.35)]" : "border-transparent",
        )}
      >
        {/* ---------------------------- Desktop ---------------------------- */}
        <div className="container-page hidden h-16 items-center gap-5 lg:flex">
          <Logo size="sm" className="shrink-0" />
          <div className="mx-auto w-full max-w-[640px] flex-1">
            <SearchBar docs={searchDocs} />
          </div>
          <nav className="flex shrink-0 items-center gap-1" aria-label="Account and bag">
            <AccountMenu />
            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishCount ? `, ${wishCount} saved` : ""}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950"
            >
              <Heart size={20} />
              <CountBubble count={wishCount} />
            </Link>
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}
              className="group ml-1 flex h-10 items-center gap-2.5 rounded-full bg-ink-950 pl-3 pr-4 text-white transition-colors hover:bg-brand-800"
            >
              <span className="relative">
                <ShoppingBag size={18} />
                <CountBubble count={count} tone="gold" />
              </span>
              <span className="text-[12.5px] font-semibold tabular-nums">
                {count > 0 ? formatINR(subtotal) : "Bag"}
              </span>
            </button>
          </nav>
        </div>

        {/* The department row folds away once the page moves, leaving a
            compact single bar. */}
        {categories.length > 0 && (
          <div
            className={cn(
              "hidden transition-[max-height,opacity] duration-300 ease-out lg:block",
              scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-14 opacity-100",
            )}
            // Hidden rows must not keep their links in the tab order.
            inert={scrolled}
          >
            <div className="container-page flex h-12 items-center gap-6">
              <MegaMenu categories={categories} />
              <div className="flex shrink-0 items-center gap-1">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Icon size={14} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------- Mobile ---------------------------- */}
        <div className="container-page flex h-14 items-center gap-1 lg:hidden">
          <IconButton label="Open menu" onClick={() => setMenuOpenAt(pathname)} className="-ml-2">
            <Menu size={22} />
          </IconButton>
          <Logo size="sm" className="h-[32px] w-[118px] sm:h-[36px] sm:w-[134px]" />
          <SearchField onOpen={() => setSearchOpenAt(pathname)} className="mx-3 hidden flex-1 sm:flex" />
          <div className="ml-auto flex items-center sm:ml-0">
            <IconButton label="Search" onClick={() => setSearchOpenAt(pathname)} className="sm:hidden">
              <Search size={20} />
            </IconButton>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="tap relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
            >
              <Heart size={20} />
              <CountBubble count={wishCount} />
            </Link>
            <IconButton label="Open bag" onClick={openCartDrawer} className="-mr-2">
              <span className="relative">
                <ShoppingBag size={20} />
                <CountBubble count={count} />
              </span>
            </IconButton>
          </div>
        </div>
      </header>

      {/* Phones lead with a full-width search field, as shopping apps do; it
          scrolls away and the magnifier in the sticky bar takes over. */}
      {!isFunnelRoute(pathname) && (
        <div className="bg-surface/80 sm:hidden">
          <div className="container-page pb-3 pt-0.5">
            <SearchField onOpen={() => setSearchOpenAt(pathname)} className="w-full" />
          </div>
        </div>
      )}

      <MobileMenu open={menuOpen} onClose={() => setMenuOpenAt(null)} categories={categories} />

      <Drawer
        open={searchOpen}
        onClose={() => setSearchOpenAt(null)}
        side="bottom"
        title="Search WeekendCart"
        className="h-[90dvh] max-h-[90dvh]"
      >
        <div className="h-full p-4">
          <SearchBar docs={searchDocs} variant="sheet" autoFocus onNavigate={() => setSearchOpenAt(null)} />
        </div>
      </Drawer>
    </>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Looks like the field and opens the search sheet, where typing happens on touch. */
function SearchField({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(
        "tap flex h-11 min-w-0 items-center gap-2.5 rounded-full border border-line bg-ink-50 px-4 text-left transition-colors duration-200 hover:border-line-strong",
        className,
      )}
    >
      <Search size={18} className="shrink-0 text-ink-400" />
      <span className="truncate text-[13.5px] text-ink-500">Search products, brands and more</span>
    </button>
  );
}

function CountBubble({ count, tone = "brand" }: { count: number; tone?: "brand" | "gold" }) {
  const reduce = usePrefersReducedMotion();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 560, damping: 22 }}
          className={cn("count-dot", tone === "gold" && "!bg-gold-400 !text-ink-950 !shadow-[0_0_0_2px_var(--color-ink-950)]")}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function MenuLink({ href, label, icon: Icon, onSelect }: NavLink & { onSelect: () => void }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="group flex h-10 items-center gap-3 rounded-lg px-2 text-[13px] font-medium text-ink-700 outline-none transition-colors duration-150 hover:bg-ink-50 hover:text-ink-950 focus-visible:bg-brand-50 focus-visible:text-brand-800"
    >
      <span className="icon-tile icon-tile-sm !bg-ink-50 !text-ink-500 transition-colors group-hover:!bg-brand-50 group-hover:!text-brand-700 group-focus-visible:!bg-surface group-focus-visible:!text-brand-700">
        <Icon size={16} />
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={14} className="text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/**
 * Signing out redirects to the home page, which is not one of the routes the
 * store re-checks the session on, so the customer is cleared here as well.
 */
function SignOutForm({
  className,
  role,
  onSignOut,
  children,
}: {
  className: string;
  role?: "menuitem";
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const { dispatch } = useStore();

  return (
    <Form
      action={logoutAction}
      role="none"
      onSubmit={() => {
        dispatch({ type: "session/set", customer: null, addresses: [] });
        onSignOut();
      }}
    >
      <button type="submit" role={role} className={className}>
        {children}
      </button>
    </Form>
  );
}

function AccountMenu() {
  const { customer, sessionChecked } = useStore();
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduce = usePrefersReducedMotion();

  const open = openAt === pathname;
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpenAt(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpenAt(null);
      trigger.current?.focus();
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Land on the first item so the arrow keys have somewhere to start.
  useEffect(() => {
    if (!open) return;
    wrapper.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, sessionChecked]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    if (!open) {
      if (e.key !== "ArrowDown") return;
      e.preventDefault();
      setOpenAt(pathname);
      return;
    }

    const items = Array.from(wrapper.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;

    e.preventDefault();
    const last = items.length - 1;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? at >= last
              ? 0
              : at + 1
            : at <= 0
              ? last
              : at - 1;
    items[next].focus();
  }

  return (
    <div ref={wrapper} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpenAt(open ? null : pathname)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "account-menu" : undefined}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3 text-left transition-colors hover:bg-ink-100",
          open && "bg-ink-100",
        )}
      >
        {customer ? (
          <Avatar src={customer.avatarUrl} seed={customer.email} size={28} />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-700">
            <User size={16} />
          </span>
        )}
        <span className="hidden text-[12.5px] font-semibold text-ink-900 xl:block">
          {customer ? `Hi, ${customer.name.split(" ")[0]}` : "Account"}
        </span>
        <span className="sr-only xl:hidden">Your account</span>
        <ChevronDown
          size={14}
          className={cn("text-ink-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="account-menu"
            role="menu"
            aria-label="Your account"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(300px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          >
            {!sessionChecked ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-500">Checking your session&hellip;</p>
            ) : customer ? (
              <>
                <div role="none" className="aurora flex items-center gap-3 px-4 py-4">
                  <Avatar src={customer.avatarUrl} seed={customer.email} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink-950">{customer.name}</span>
                    <span className="block truncate text-[12px] text-ink-600">{customer.email}</span>
                  </span>
                </div>
                <div role="none" className="p-2">
                  {ACCOUNT_LINKS.map((link) => (
                    <MenuLink key={link.href} {...link} onSelect={close} />
                  ))}
                </div>
                <div role="none" className="border-t border-line p-2">
                  <SignOutForm
                    role="menuitem"
                    onSignOut={close}
                    className="group flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] font-medium text-ink-600 outline-none transition-colors hover:bg-sale-50 hover:text-sale-700 focus-visible:bg-sale-50 focus-visible:text-sale-700"
                  >
                    <span className="icon-tile icon-tile-sm !bg-ink-50 !text-ink-500 group-hover:!bg-surface group-hover:!text-sale-600">
                      <LogOut size={16} />
                    </span>
                    Sign out
                  </SignOutForm>
                </div>
              </>
            ) : (
              <>
                <div role="none" className="aurora px-4 py-4">
                  <p className="text-[14px] font-semibold text-ink-950">Welcome to {BUSINESS.brandName}</p>
                  <p className="mt-0.5 text-[12px] text-ink-600">Sign in for faster checkout and order tracking.</p>
                  <div role="none" className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={close}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand-700 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      <LogIn size={14} /> Sign in
                    </Link>
                    <Link
                      href="/register"
                      role="menuitem"
                      onClick={close}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-surface text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-line-strong transition-colors hover:ring-brand-300"
                    >
                      <UserPlus size={14} /> Register
                    </Link>
                  </div>
                </div>
                <div role="none" className="p-2">
                  {GUEST_LINKS.map((link) => (
                    <MenuLink key={link.href} {...link} onSelect={close} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnnouncementBar() {
  const { config } = useStore();
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // Every line here is a promise made on every page, so each one must be true.
  const items: { text: string; icon: LucideIcon }[] = [
    { text: `Free delivery on orders above ₹${config.rates.freeThreshold.toLocaleString("en-IN")}`, icon: Truck },
    { text: `${BUSINESS.ops.returnWindowDays}-day returns on most items`, icon: RotateCcw },
    { text: "Bought and invoiced by us, not a marketplace", icon: ReceiptText },
  ];

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % 3), 4200);
    return () => clearInterval(id);
  }, [reduce]);

  const current = items[index % items.length];
  const CurrentIcon = current.icon;

  return (
    <div className="midnight text-white">
      <div className="container-page flex h-9 items-center justify-center gap-6 text-[11.5px] font-medium lg:justify-between">
        {/* Phones: one line at a time. */}
        <p className="flex items-center gap-2 text-white/90 lg:hidden" aria-live="off">
          <CurrentIcon size={14} className="shrink-0 text-gold-300" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.text}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="truncate"
            >
              {current.text}
            </motion.span>
          </AnimatePresence>
        </p>
        <ul className="hidden items-center gap-6 lg:flex">
          {items.map(({ text, icon: Icon }) => (
            <li key={text} className="flex items-center gap-2 text-white/85">
              <Icon size={14} className="text-gold-300" />
              {text}
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-5 lg:flex">
          <Link href="/track" className="inline-flex items-center gap-1.5 text-white/80 transition-colors hover:text-white">
            <Package size={14} /> Track order
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-1.5 text-white/80 transition-colors hover:text-white">
            <LifeBuoy size={14} /> Help &amp; support
          </Link>
          <span className="inline-flex items-center gap-1.5 text-white/80">
            <ShieldCheck size={14} /> Secure payments
          </span>
        </div>
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
  const { wishlist, customer, hydrated } = useStore();
  const links = customer ? ACCOUNT_LINKS : GUEST_LINKS;

  return (
    <Drawer open={open} onClose={onClose} side="left" className="max-w-[min(340px,calc(100vw-3rem))]">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-3">
        <div className="aurora rounded-2xl px-4 py-4">
          <p className="text-[14px] font-semibold text-ink-950">
            {customer ? `Hello, ${customer.name.split(" ")[0]}` : "Welcome"}
          </p>
          <p className="mt-0.5 break-words text-[12px] text-ink-600">
            {customer ? customer.email : "Sign in for faster checkout and order tracking."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {customer ? (
              <>
                <MenuButton href="/account" onClick={onClose} primary>
                  My account
                </MenuButton>
                <MenuButton href="/account/orders" onClick={onClose}>
                  My orders
                </MenuButton>
              </>
            ) : (
              <>
                <MenuButton href="/login" onClick={onClose} primary>
                  Sign in
                </MenuButton>
                <MenuButton href="/register" onClick={onClose}>
                  Create account
                </MenuButton>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" aria-label="Mobile navigation">
        <ul className="mb-4 grid grid-cols-3 gap-2">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className="tap flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-1 py-3 text-center text-[11.5px] font-semibold text-ink-800"
              >
                <span className="icon-tile icon-tile-sm">
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {categories.length > 0 && (
          <>
            <p className="t-label px-2 pb-2">Shop by category</p>
            <ul className="mb-4">
              {categories.map((category) => {
                const isOpen = expanded === category.slug;
                return (
                  <li key={category.slug}>
                    <button
                      onClick={() => setExpanded((s) => (s === category.slug ? null : category.slug))}
                      aria-expanded={isOpen}
                      className="tap flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink-50"
                    >
                      <span className="icon-tile icon-tile-sm">
                        <CategoryIcon icon={category.icon} name={category.name} size={16} />
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink-900">{category.name}</span>
                      <ChevronDown
                        size={16}
                        className={cn("text-ink-400 transition-transform duration-200", isOpen && "rotate-180")}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-[26px] overflow-hidden border-l border-line pl-4"
                        >
                          <li>
                            <Link
                              href={`/c/${category.slug}`}
                              onClick={onClose}
                              className="tap flex min-h-10 items-center text-[13px] font-semibold text-brand-700"
                            >
                              All {category.name}
                            </Link>
                          </li>
                          {category.subcategories.map((sub) => (
                            <li key={sub.slug}>
                              <Link
                                href={`/c/${category.slug}/${sub.slug}`}
                                onClick={onClose}
                                className="tap flex min-h-10 items-center text-[13px] text-ink-600 hover:text-ink-950"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="t-label px-2 pb-2">Your account</p>
        <ul>
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className="tap flex min-h-11 items-center gap-3 rounded-lg px-2 text-[13.5px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-950"
              >
                <Icon size={18} className="text-ink-500" />
                <span className="flex-1">{label}</span>
                {href === "/wishlist" && hydrated && wishlist.length > 0 && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 tabular-nums">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {customer && (
            <li>
              <SignOutForm
                onSignOut={onClose}
                className="tap flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-[13.5px] text-ink-600 transition-colors hover:bg-sale-50 hover:text-sale-700"
              >
                <LogOut size={18} className="text-ink-500" />
                Sign out
              </SignOutForm>
            </li>
          )}
        </ul>
      </nav>
    </Drawer>
  );
}

function MenuButton({
  href,
  onClick,
  primary = false,
  children,
}: {
  href: string;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "tap flex h-10 items-center justify-center whitespace-nowrap rounded-md px-2 text-[13px] font-semibold",
        primary ? "bg-brand-700 text-white" : "bg-surface text-ink-900 ring-1 ring-inset ring-line-strong",
      )}
    >
      {children}
    </Link>
  );
}
