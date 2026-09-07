"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Boxes,
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
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export interface SidebarCounts {
  orders: number;
  returns: number;
  reviews: number;
  messages: number;
  lowStock: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  count?: number;
  countTone?: "gold" | "sale";
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
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Layers },
      { href: "/admin/brands", label: "Brands", icon: Tag },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, count: c.lowStock, countTone: "sale" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/offers", label: "Coupons & offers", icon: BadgePercent },
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/reviews", label: "Reviews & Q&A", icon: Star, count: c.reviews },
    ],
  },
  {
    label: "Support",
    items: [{ href: "/admin/messages", label: "Inbox", icon: Inbox, count: c.messages }],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: Activity },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ counts, onNavigate }: { counts: SidebarCounts; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-hairline px-5">
        <Logo size="sm" href="/admin" />
        <span className="rounded-md bg-brand-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white">
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {GROUPS(counts).map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                const count = item.count ?? 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                        active
                          ? "bg-brand-50 font-semibold text-brand-900"
                          : "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
                      )}
                    >
                      <Icon size={16} className={active ? "text-brand-700" : "text-ink-400"} />
                      <span className="flex-1">{item.label}</span>
                      {count ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                            item.countTone === "sale"
                              ? "bg-sale-100 text-sale-700"
                              : "bg-gold-100 text-gold-800",
                          )}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950"
        >
          <ExternalLink size={14} /> View storefront
        </Link>
      </div>
    </div>
  );
}
