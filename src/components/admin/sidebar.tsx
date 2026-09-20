"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  ChevronDown,
  ExternalLink,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Layers,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useStored } from "./use-stored";

export interface SidebarCounts {
  orders: number;
  returns: number;
  reviews: number;
  messages: number;
  lowStock: number;
}

interface NavChild {
  href: string;
  label: string;
  exact?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  count?: number;
  countTone?: "gold" | "sale";
  /** A submenu. The parent still links to its own page. */
  children?: NavChild[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS = (c: SidebarCounts): NavGroup[] => [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, count: c.orders },
      { href: "/admin/returns", label: "Returns", icon: RotateCcw, count: c.returns },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: Package,
        children: [
          { href: "/admin/products", label: "All products", exact: true },
          { href: "/admin/products/new", label: "New product" },
        ],
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: Layers,
        children: [
          { href: "/admin/categories", label: "All categories", exact: true },
          { href: "/admin/categories/new", label: "New category" },
        ],
      },
      { href: "/admin/brands", label: "Brands", icon: Tag },
      { href: "/admin/suppliers", label: "Wholesalers", icon: Truck },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, count: c.lowStock, countTone: "sale" },
      { href: "/admin/media", label: "Images", icon: ImageIcon },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/reviews", label: "Reviews & Q&A", icon: Star, count: c.reviews },
    ],
  },
  {
    label: "Support",
    items: [
      {
        href: "/admin/messages",
        label: "Inbox",
        icon: Inbox,
        count: c.messages,
        children: [
          { href: "/admin/messages", label: "Messages", exact: true },
          { href: "/admin/messages/subscribers", label: "Subscribers" },
          { href: "/admin/messages/blocked", label: "Blocked attempts" },
        ],
      },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: Activity },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        children: [
          { href: "/admin/settings", label: "Store", exact: true },
          { href: "/admin/settings/shipping", label: "Shipping" },
          { href: "/admin/settings/payments", label: "Payments" },
          { href: "/admin/settings/tax", label: "Tax" },
          { href: "/admin/settings/inventory", label: "Inventory" },
          { href: "/admin/settings/team", label: "Team" },
          { href: "/admin/settings/maintenance", label: "Maintenance" },
          { href: "/admin/settings/profile", label: "Your account" },
        ],
      },
    ],
  },
];

/* ------------------------------ Memory ------------------------------ */

const STORE_KEY = "weekendcart:admin:sidebar";

interface Remembered {
  /** Group labels that are folded shut. */
  closedGroups: string[];
  /** Item hrefs whose submenu is folded open. */
  openMenus: string[];
}

const EMPTY: Remembered = { closedGroups: [], openMenus: [] };

function parseMemory(text: string): Remembered {
  try {
    const raw = JSON.parse(text) as Partial<Remembered>;
    return {
      closedGroups: Array.isArray(raw.closedGroups) ? raw.closedGroups.filter((x) => typeof x === "string") : [],
      openMenus: Array.isArray(raw.openMenus) ? raw.openMenus.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return EMPTY;
  }
}

/* ------------------------------ Sidebar ----------------------------- */

const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/**
 * The admin navigation.
 *
 * Two shapes. Full width, it is a list of groups: a group folds shut from its
 * heading, and an item with a submenu folds open from the chevron beside it.
 * As a rail (`collapsed`) it is icons only, and pointing at an icon — or
 * tabbing to it — opens a flyout with the item's name and its submenu, so
 * nothing is more than one move away and nothing depends on a mouse.
 *
 * What is folded is remembered in this browser. The page being viewed always
 * shows: a folded group or submenu that holds the current page opens itself.
 */
export function AdminSidebar({
  counts,
  onNavigate,
  collapsed = false,
}: {
  counts: SidebarCounts;
  onNavigate?: () => void;
  /** The rail. The control that flips it lives in the header, not in here. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  // A rail flyout opens on focus as well as on hover, and a click leaves focus
  // on the icon — so after navigating, that flyout stayed open over the page
  // until something else was clicked. Arriving somewhere new lets go of it.
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-admin-nav]")) active.blur();
  }, [pathname]);
  const [stored, setStored] = useStored(STORE_KEY, "{}");
  const memory = useMemo(() => parseMemory(stored), [stored]);
  const remember = (next: Remembered) => setStored(JSON.stringify(next));
  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        {collapsed ? (
          <Link href="/admin" aria-label="Dashboard" className="bg-brand-900 px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-white">
            WC
          </Link>
        ) : (
          <>
            <Logo size="sm" href="/admin" />
            <span className="bg-brand-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white">Admin</span>
          </>
        )}
      </div>

      <nav
        className={cn("flex-1 py-4", collapsed ? "overflow-visible px-2" : "overflow-y-auto px-3")}
        aria-label="Admin navigation"
        data-admin-nav
      >
        {GROUPS(counts).map((group) => {
          const holdsCurrent = group.items.some((item) => isActive(pathname, item.href, item.exact));
          const groupOpen = collapsed || holdsCurrent || !memory.closedGroups.includes(group.label);
          const groupId = `nav-group-${group.label.toLowerCase()}`;
          const lowOnScreen = group.label === "Store" || group.label === "Support";

          return (
            <div key={group.label} className={collapsed ? "mb-2" : "mb-3"}>
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-ink-200" aria-hidden />
              ) : (
                <button
                  type="button"
                  onClick={() => remember({ ...memory, closedGroups: toggle(memory.closedGroups, group.label) })}
                  aria-expanded={groupOpen}
                  aria-controls={groupId}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400 transition-colors hover:text-ink-700"
                >
                  {group.label}
                  <ChevronDown size={12} className={cn("transition-transform duration-200", !groupOpen && "-rotate-90")} />
                </button>
              )}

              <div
                id={groupId}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  groupOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <ul className={cn("min-h-0 space-y-0.5", collapsed ? "overflow-visible" : "overflow-hidden")} inert={!groupOpen}>
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href, item.exact);
                    const Icon = item.icon;
                    const count = item.count ?? 0;
                    const childActive = item.children?.some((c) => isActive(pathname, c.href, c.exact)) ?? false;
                    const menuOpen = !collapsed && (memory.openMenus.includes(item.href) || (active && !!item.children));
                    const menuId = `nav-menu-${item.href.replace(/\W+/g, "-")}`;

                    return (
                      <li key={item.href} className="group/item relative">
                        <div className="flex items-stretch">
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active && !childActive ? "page" : undefined}
                            aria-label={collapsed ? item.label : undefined}
                            className={cn(
                              "relative flex min-w-0 flex-1 items-center gap-2.5 py-2 text-[13.5px] transition-colors",
                              collapsed ? "justify-center px-0" : "px-2.5",
                              active
                                ? "bg-brand-50 font-semibold text-brand-900"
                                : "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
                            )}
                          >
                            <Icon size={collapsed ? 18 : 16} className={cn("shrink-0", active ? "text-brand-700" : "text-ink-400")} />
                            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                            {count ? (
                              collapsed ? (
                                <span
                                  aria-hidden
                                  className={cn("absolute right-1.5 top-1.5 h-2 w-2", item.countTone === "sale" ? "bg-sale-600" : "bg-gold-500")}
                                />
                              ) : (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                                    item.countTone === "sale" ? "bg-sale-100 text-sale-700" : "bg-gold-100 text-gold-800",
                                  )}
                                >
                                  {count > 99 ? "99+" : count}
                                </span>
                              )
                            ) : null}
                          </Link>

                          {!collapsed && item.children && (
                            <button
                              type="button"
                              onClick={() => remember({ ...memory, openMenus: toggle(memory.openMenus, item.href) })}
                              aria-expanded={menuOpen}
                              aria-controls={menuId}
                              aria-label={`${menuOpen ? "Fold" : "Unfold"} ${item.label} menu`}
                              className="flex w-8 shrink-0 items-center justify-center text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                            >
                              <ChevronDown size={14} className={cn("transition-transform duration-200", !menuOpen && "-rotate-90")} />
                            </button>
                          )}
                        </div>

                        {/* Full width: the submenu folds open in place. */}
                        {!collapsed && item.children && (
                          <div
                            id={menuId}
                            className={cn(
                              "grid transition-[grid-template-rows] duration-200 ease-out",
                              menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <ul className="min-h-0 overflow-hidden" inert={!menuOpen}>
                              {item.children.map((child) => {
                                const on = isActive(pathname, child.href, child.exact);
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      onClick={onNavigate}
                                      aria-current={on ? "page" : undefined}
                                      className={cn(
                                        "ml-[18px] block border-l py-1.5 pl-4 pr-2 text-[13px] transition-colors",
                                        on
                                          ? "border-brand-700 font-semibold text-brand-900"
                                          : "border-ink-200 text-ink-600 hover:border-ink-400 hover:text-ink-950",
                                      )}
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Rail: the flyout. Opens on hover and on keyboard focus
                            within the item, so it never needs a mouse. */}
                        {collapsed && (
                          <div
                            className={cn(
                              "pointer-events-none invisible absolute left-full z-50 pl-2 opacity-0 transition-[opacity,transform,visibility] duration-150 ease-out",
                              // Near the foot of the screen a flyout that grew downward would be cut
                              // off by the viewport, so the last groups grow upward instead.
                              lowOnScreen ? "bottom-0" : "top-0",
                              "-translate-x-1 group-hover/item:pointer-events-auto group-hover/item:visible group-hover/item:translate-x-0 group-hover/item:opacity-100",
                              "group-focus-within/item:pointer-events-auto group-focus-within/item:visible group-focus-within/item:translate-x-0 group-focus-within/item:opacity-100",
                            )}
                          >
                            <div className="min-w-[184px] bg-surface py-1.5 shadow-lg ring-1 ring-ink-200">
                              <p className="flex items-center justify-between gap-3 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950">
                                {item.label}
                                {count ? (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                                      item.countTone === "sale" ? "bg-sale-100 text-sale-700" : "bg-gold-100 text-gold-800",
                                    )}
                                  >
                                    {count > 99 ? "99+" : count}
                                  </span>
                                ) : null}
                              </p>
                              {item.children && (
                                <ul className="mt-1 border-t border-ink-100 pt-1">
                                  {item.children.map((child) => {
                                    const on = isActive(pathname, child.href, child.exact);
                                    return (
                                      <li key={child.href}>
                                        <Link
                                          href={child.href}
                                          aria-current={on ? "page" : undefined}
                                          className={cn(
                                            "block px-3 py-1.5 text-[13px] transition-colors",
                                            on ? "bg-brand-50 font-semibold text-brand-900" : "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
                                          )}
                                        >
                                          {child.label}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn("shrink-0 space-y-0.5 p-3", collapsed && "px-2")}>
        <Link
          href="/"
          target="_blank"
          aria-label={collapsed ? "View storefront" : undefined}
          title={collapsed ? "View storefront" : undefined}
          className={cn(
            "flex items-center gap-2 py-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950",
            collapsed ? "justify-center" : "px-2.5",
          )}
        >
          <ExternalLink size={14} /> {!collapsed && "View storefront"}
        </Link>
      </div>
    </div>
  );
}
