"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Heart,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  User,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { Logo, LogoLight } from "@/components/brand/logo";
import { DepartmentGlyph } from "@/components/illustration/department-glyph";
import { MegaMenu } from "./mega-menu";
import { SearchBar } from "./search-bar";
import { isFunnelRoute } from "./bottom-nav";
import type { SearchDoc } from "@/lib/search-index";
import type { Category } from "@/lib/types";
import { Drawer } from "@/components/ui/overlay";
import { logoutAction } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cartCount } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { BUSINESS } from "@/config/business";
import { Avatar } from "@/components/account/avatar";

/** Everything the account owns, in the order a shopper is likely to want it. */
const ACCOUNT_LINKS = [
  { href: "/account", label: "My account", icon: UserRound },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/track", label: "Track an order", icon: Truck },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/settings#payment", label: "Payment preferences", icon: CreditCard },
  { href: "/account/returns", label: "Returns and refunds", icon: RotateCcw },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/contact", label: "Help and support", icon: LifeBuoy },
];

const GUEST_LINKS = [
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/register", label: "Create an account", icon: UserPlus },
];

const GUEST_HELP_LINKS = [
  { href: "/track", label: "Track an order", icon: Truck },
  { href: "/contact", label: "Help and support", icon: LifeBuoy },
];

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

      {/* Evergreen, not white.
          A white masthead over a white product grid gives the page no top: the
          chrome and the goods are the same plane, and the shopper has to read
          the header to find it. A saturated bar is the oldest device in retail
          for a reason — it says "the shop starts here", it makes the search
          field an object sitting IN something rather than a rectangle drawn on
          nothing, and it gives the one ember accent (the bag count) a ground
          dark enough to shout from.
          The bar is brand-900 with the announcement strip a shade darker above
          it and the department rail a shade lighter below, so the whole
          masthead reads as one block with its own internal order. */}
      <header
        className={cn(
          "sticky top-0 z-50 bg-brand-900 text-white transition-shadow duration-300",
          scrolled ? "shadow-lg" : "",
        )}
      >
        {/* Each row carries its own container rather than one wrapping them
            all, so a row can paint its own full-width ground (the department
            rail does) without a negative-margin bleed that would put the whole
            document into a horizontal scroll behind a visible scrollbar. */}
        <div className="container-page">
          {/* ---------------------------- Desktop --------------------------- */}
          <div className="hidden items-center gap-6 py-3 lg:flex">
            <LogoLight />
            <div className="max-w-2xl flex-1">
              <SearchBar docs={searchDocs} />
            </div>
            <nav className="flex items-center gap-1" aria-label="Account and cart">
              <AccountMenu />
              <HeaderAction
                href="/wishlist"
                icon={<Heart size={19} />}
                label="Wishlist"
                sublabel="Saved"
                count={wishCount}
              />
              <button
                onClick={openCartDrawer}
                className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10"
              >
                <span className="relative">
                  <ShoppingBag size={19} className="text-white" />
                  <CountBubble count={count} />
                </span>
                <span className="hidden xl:block">
                  {/* The three controls in this row all carry a sublabel over a
                      name, so all three are set as the site's small-caps label
                      rather than as 10px of decorative ink-400: at that size
                      and that contrast it was the one line in the masthead
                      nobody could actually read. */}
                  <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-200">
                    Your bag
                  </span>
                  <span className="block text-[13px] font-semibold text-white">
                    {count > 0 ? `${count} item${count > 1 ? "s" : ""}` : "Empty"}
                  </span>
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* The department bar only exists to hold departments. With none it
            would be a rule across the page with two links pushed to the far
            right — so it is left out until there is a category to put in it. */}
        {categories.length > 0 && (
          <div className="hidden bg-brand-800 lg:block">
            <div className="container-page flex items-center justify-between py-1">
              <MegaMenu categories={categories} />
              <div className="flex items-center gap-5 text-[13px]">
                <Link
                  href="/track"
                  className="inline-flex items-center gap-1.5 text-brand-100 transition-colors duration-200 hover:text-white"
                >
                  <Package size={14} /> Track order
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-brand-100 transition-colors duration-200 hover:text-white"
                >
                  <LifeBuoy size={14} /> Help
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="container-page">
          {/* ---------------------------- Mobile ---------------------------- */}
          {/* 57px exactly: the listing toolbar sticks at top-[57px], its top
              rule tucked under this bar's. */}
          <div className="flex h-[57px] items-center gap-0.5 lg:hidden">
            <button
              onClick={() => setMenuOpenAt(pathname)}
              aria-label="Open menu"
              className="tap -ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
            >
              <Menu size={21} />
            </button>
            <LogoLight size="sm" className="h-[34px] w-[126px] sm:h-[38px] sm:w-[141px]" />
            {/* Tablets have the width for the field itself. */}
            <SearchField
              onOpen={() => setSearchOpenAt(pathname)}
              className="mx-3 hidden flex-1 sm:flex"
            />
            <button
              onClick={() => setSearchOpenAt(pathname)}
              aria-label="Search"
              className="tap ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 sm:hidden"
            >
              <Search size={20} />
            </button>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
            >
              <span className="relative">
                <Heart size={20} />
                <CountBubble count={wishCount} />
              </span>
            </Link>
            <button
              onClick={openCartDrawer}
              aria-label="Open bag"
              className="tap -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
            >
              <span className="relative">
                <ShoppingBag size={20} />
                <CountBubble count={count} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Phones lead with a full-width search field, as shopping apps do. It
          scrolls away with the page and the magnifier in the sticky bar takes
          over from there — but it keeps the evergreen ground rather than
          sitting on the canvas, so the masthead reads as one block that ends
          at a single edge instead of a green bar with a grey strip stuck
          underneath it. */}
      {!isFunnelRoute(pathname) && (
        <div className="bg-brand-900 sm:hidden">
          <div className="container-page pb-2.5">
            <SearchField onOpen={() => setSearchOpenAt(pathname)} className="w-full" />
          </div>
        </div>
      )}

      <MobileMenu open={menuOpen} onClose={() => setMenuOpenAt(null)} categories={categories} />

      {/* A fixed height rather than one that follows the results, so the field
          holds its place above the keyboard as suggestions come and go. */}
      <Drawer
        open={searchOpen}
        onClose={() => setSearchOpenAt(null)}
        side="bottom"
        title="Search WeekendCart"
        className="h-[90dvh] max-h-[90dvh]"
      >
        {/* The Drawer's scroll area already clears the home indicator. */}
        <div className="h-full p-4">
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

/**
 * Stands in for the search input below desktop: it looks like the field and
 * opens the search sheet, which is where typing happens on a touch screen.
 */
function SearchField({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(
        "tap flex h-10 min-w-0 items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 text-left transition-colors duration-200 hover:border-ink-950",
        className,
      )}
    >
      <Search size={16} className="shrink-0 text-ink-400" />
      <span className="truncate text-[13.5px] text-ink-500">Search WeekendCart</span>
    </button>
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
          // Ember, not sale colour. A bag count is a fact, not a reduction,
          // and sale colour spent on it is the reason a genuine price cut
          // further down the page stops being believed. Ink was right while
          // the masthead was white; on the evergreen bar it disappears, and
          // ember is the one colour on the site that means "yours to act on".
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold leading-none text-ink-950 tabular-nums"
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
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/10"
    >
      <span className="relative text-white">
        {icon}
        <CountBubble count={count} />
      </span>
      <span className="hidden xl:block">
        <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-200">
          {sublabel}
        </span>
        <span className="block text-[13px] font-semibold text-white">{label}</span>
      </span>
    </Link>
  );
}

function MenuLink({
  href,
  label,
  icon: Icon,
  onSelect,
}: {
  href: string;
  label: string;
  icon: typeof User;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      // Ruled rows, as the department menu indexes its collections: the rule
      // is what makes eight destinations read as one list rather than as eight
      // separate things floating in a panel.
      className="group flex h-10 items-center gap-2.5 border-b border-hairline px-4 text-[13px] text-ink-700 transition-colors duration-200 hover:text-brand-700 focus-visible:text-brand-700"
    >
      <Icon
        size={15}
        className="shrink-0 text-ink-400 transition-colors duration-200 group-hover:text-brand-700"
      />
      {label}
    </Link>
  );
}

/**
 * Signing out redirects to the home page, which is not one of the routes the
 * store re-checks the session on, so the customer is cleared here as well —
 * otherwise the header goes on greeting somebody who has already left.
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

  // Landing on the first item means the arrow keys have somewhere to start and
  // a keyboard user is never left with focus on a trigger that has moved on.
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

    const items = Array.from(
      wrapper.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
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
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10"
      >
        <span className="text-white">
          <User size={19} />
        </span>
        <span className="sr-only xl:hidden">Account</span>
        <span className="hidden xl:block">
          <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-200">
            {customer ? "Your account" : sessionChecked ? "Sign in" : ""}
          </span>
          <span className="block text-[13px] font-semibold text-white">
            {customer ? `Hi, ${customer.name.split(" ")[0]}` : "Account"}
          </span>
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "hidden text-brand-300 transition-transform duration-200 xl:block",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="account-menu"
            role="menu"
            aria-label="Your account"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            // The same sheet the department menu is drawn on, a quarter of the
            // width: a hairline and the same elevation, so the two panels that
            // can open from this one bar are plainly the same object.
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(276px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-hairline bg-surface shadow-xl"
          >
            {!sessionChecked ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-500">
                Checking your session&hellip;
              </p>
            ) : customer ? (
              <>
                <div role="none" className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
                  <Avatar src={customer.avatarUrl} seed={customer.email} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink-950">
                      {customer.name}
                    </span>
                    <span className="block truncate text-[13px] text-ink-500">
                      {customer.email}
                    </span>
                  </span>
                </div>
                <div role="none">
                  {ACCOUNT_LINKS.map((link) => (
                    <MenuLink key={link.href} {...link} onSelect={close} />
                  ))}
                </div>
                {/* The last row closes the list, so it drops the rule it would
                    otherwise draw a hair above the panel's own bottom edge. */}
                <div role="none">
                  <SignOutForm
                    role="menuitem"
                    onSignOut={close}
                    className="flex h-10 w-full items-center gap-2.5 px-4 text-left text-[13px] text-ink-500 transition-colors duration-200 hover:text-sale-600 focus-visible:text-sale-600"
                  >
                    <LogOut size={15} className="shrink-0 text-ink-400" />
                    Sign out
                  </SignOutForm>
                </div>
              </>
            ) : (
              <>
                <div role="none">
                  {GUEST_LINKS.map((link) => (
                    <MenuLink key={link.href} {...link} onSelect={close} />
                  ))}
                </div>
                {/* The rule under the row above already separates signing in
                    from getting help; the last row of the panel draws none, so
                    that it does not double up with the frame's own edge. */}
                <div role="none" className="[&>a:last-child]:border-b-0">
                  {GUEST_HELP_LINKS.map((link) => (
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
  // Every line here is a promise made on every page of the shop, so each one
  // has to be true at the moment it is shown.
  const items = [
    `Free delivery on orders above ₹${config.rates.freeThreshold.toLocaleString("en-IN")}`,
    // Both claims below have to be ones we can stand behind. Free pickup is
    // only offered where the courier services the pincode, and "sourced direct
    // from brands" was never true of a reseller — what is true is that we hold
    // the stock and invoice it ourselves.
    `${BUSINESS.ops.returnWindowDays}-day returns on most items`,
    "Bought and invoiced by us, not a marketplace",
  ];

  return (
    // brand-950, a shade under the bar below it. The strip used to be the
    // `deep-plane` gradient, which was right while the header was white and
    // this was the only dark thing on the page; over an evergreen masthead the
    // gradient's lit corner reads as a smudge rather than as a separate rail.
    <div className="overflow-hidden bg-brand-950 py-1.5 text-white sm:py-2">
      {/* The speed is the one declared in globals.css. Hand-rolled at 38s this
          read as a news ticker, which is the opposite of what a shop wants:
          a sign is something you can finish reading. */}
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {[0, 1].map((dup) => (
          <ul key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 whitespace-nowrap px-4 text-[11.5px] font-semibold uppercase tracking-[0.12em] tabular-nums text-brand-100 sm:px-6"
              >
                {/* Ember is worth something only while it is rare, and a strip
                    that repeats it six times a loop on every page of the shop
                    spends it faster than anything else could. */}
                <span aria-hidden className="h-px w-3 shrink-0 bg-white/30" />
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
  const { wishlist, customer, hydrated } = useStore();

  const links = [
    ...(customer
      ? [
          { href: "/account", label: "My account" },
          { href: "/account/orders", label: "My orders" },
          { href: "/track", label: "Track an order" },
          { href: "/account/addresses", label: "Saved addresses" },
          { href: "/account/settings#payment", label: "Payment preferences" },
          { href: "/account/returns", label: "Returns and refunds" },
        ]
      : [{ href: "/track", label: "Track an order" }]),
    {
      href: "/wishlist",
      label: `Wishlist${hydrated && wishlist.length ? ` (${wishlist.length})` : ""}`,
    },
    { href: "/contact", label: "Help and support" },
    { href: "/faq", label: "FAQ" },
  ];

  // Only reachable below lg, and never wider than 330px, so one compact scale
  // serves phones and tablets alike. The width leaves a strip of page showing
  // on small phones, to tap away as in a native drawer.
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      className="max-w-[min(330px,calc(100vw-3rem))]"
    >
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <Logo size="sm" />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* The drawer's one dark plane. The greeting is set in the text face:
          Fraunces draws band titles and product titles, and at the 16px this
          line used to be it was neither — just the display face borrowed for a
          label, which is how a type system comes apart. */}
      <div className="deep-plane border-b border-hairline px-4 py-4 text-white">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">
          {customer ? `Hello, ${customer.name.split(" ")[0]}` : "Welcome back"}
        </p>
        <p className="mt-0.5 break-words text-[13px] leading-[1.5] text-white/70">
          {customer
            ? customer.email
            : "Sign in for faster checkout and order tracking."}
        </p>
        {/* Sentence case, not the uppercase tracking the shop's calls to action
            wear: the drawer is never wider than 330px, and "Create account" set
            in small caps overruns its half of the row on a 320px phone. */}
        <div className="mt-3 flex gap-2">
          {customer ? (
            <>
              <Link
                href="/account"
                className="tap flex h-10 flex-1 items-center justify-center whitespace-nowrap bg-white px-2.5 text-center text-[13px] font-semibold text-ink-950"
              >
                My account
              </Link>
              <Link
                href="/account/settings"
                className="tap flex h-10 flex-1 items-center justify-center whitespace-nowrap border border-white/30 px-2.5 text-center text-[13px] font-semibold text-white"
              >
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="tap flex h-10 flex-1 items-center justify-center whitespace-nowrap bg-white px-2.5 text-center text-[13px] font-semibold text-ink-950"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="tap flex h-10 flex-1 items-center justify-center whitespace-nowrap border border-white/30 px-2.5 text-center text-[13px] font-semibold text-white"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      <nav
        className="px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2"
        aria-label="Mobile navigation"
      >
        {categories.length > 0 && (
        <p className="px-2 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Shop by category
        </p>
        )}
        <ul>
          {categories.map((category) => (
            <li key={category.slug}>
              <button
                onClick={() =>
                  setExpanded((s) => (s === category.slug ? null : category.slug))
                }
                aria-expanded={expanded === category.slug}
                className="tap flex min-h-10 w-full items-center gap-3 px-2 py-1.5 text-left transition-colors duration-200 hover:bg-ink-50"
              >
                {/* The 36px photograph each of these rows used to carry has gone
                    everywhere else in the shop; left here it would read as a
                    redesign somebody abandoned halfway down the drawer. The row
                    keeps a 40px minimum so the target stays the size it was. */}
                <DepartmentGlyph
                  icon={category.icon}
                  name={category.name}
                  size={20}
                  className="shrink-0 text-ink-400"
                />
                <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink-900">
                  {category.name}
                </span>
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
                    // 32px, not 48: the indent exists to hang the collections
                    // off the department's own name, and the name moved left
                    // when the 36px thumbnail became a 20px mark.
                    className="overflow-hidden pl-8"
                  >
                    <li>
                      <Link
                        href={`/c/${category.slug}`}
                        onClick={onClose}
                        className="tap flex min-h-10 items-center px-2 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors duration-200 hover:bg-ink-50"
                      >
                        All {category.name}
                      </Link>
                    </li>
                    {category.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${category.slug}/${sub.slug}`}
                          onClick={onClose}
                          className="tap flex min-h-10 items-center px-2 py-1.5 text-[13px] text-ink-600 transition-colors duration-200 hover:bg-ink-50 hover:text-ink-900"
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

        <p className="px-2 pb-1 pt-4 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Your account
        </p>
        <ul>
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="tap flex min-h-10 items-center px-2 py-1.5 text-[13.5px] text-ink-700 transition-colors duration-200 hover:bg-ink-50 hover:text-ink-950"
              >
                {item.label}
              </Link>
            </li>
          ))}
          {customer && (
            <li>
              <SignOutForm
                onSignOut={onClose}
                className="tap flex min-h-10 w-full items-center px-2 py-1.5 text-left text-[13.5px] text-ink-500 transition-colors duration-200 hover:bg-ink-50 hover:text-sale-600"
              >
                Sign out
              </SignOutForm>
            </li>
          )}
        </ul>
      </nav>
    </Drawer>
  );
}
