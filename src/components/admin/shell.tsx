"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, Search, X } from "lucide-react";
import { AdminSidebar, type SidebarCounts } from "./sidebar";
import { FlashMessage } from "./client";
import { logoutAdminAction } from "@/services/admin/auth-actions";
import { StatusPill } from "./ui";

export interface AdminShellUser {
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

const TITLES: [RegExp, string][] = [
  [/^\/admin$/, "Dashboard"],
  [/^\/admin\/orders\/.+/, "Order"],
  [/^\/admin\/orders/, "Orders"],
  [/^\/admin\/returns/, "Returns"],
  [/^\/admin\/customers\/.+/, "Customer"],
  [/^\/admin\/customers/, "Customers"],
  [/^\/admin\/products\/new/, "New product"],
  [/^\/admin\/products\/.+/, "Edit product"],
  [/^\/admin\/products/, "Products"],
  [/^\/admin\/categories/, "Categories"],
  [/^\/admin\/brands/, "Brands"],
  [/^\/admin\/inventory/, "Inventory"],
  [/^\/admin\/offers/, "Coupons & offers"],
  [/^\/admin\/banners/, "Banners"],
  [/^\/admin\/reviews/, "Reviews & Q&A"],
  [/^\/admin\/messages/, "Inbox"],
  [/^\/admin\/activity/, "Activity log"],
  [/^\/admin\/settings/, "Settings"],
];

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: AdminShellUser;
  counts: SidebarCounts;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "Admin";

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)] print:block print:min-h-0">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-hairline bg-surface lg:sticky lg:top-0 lg:block lg:h-dvh print:hidden">
        <AdminSidebar counts={counts} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink-950/45"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute inset-y-0 left-0 w-[280px] bg-surface shadow-xl"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
              >
                <X size={18} />
              </button>
              <AdminSidebar counts={counts} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur-lg sm:px-6 print:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <h1 className="min-w-0 truncate font-display text-[17px] tracking-[-0.01em] text-ink-950">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="hidden h-9 items-center gap-2 rounded-lg border border-ink-200 bg-canvas px-3 text-[12.5px] text-ink-500 transition-colors hover:border-ink-400 md:flex"
            >
              <Search size={14} /> Find an order…
            </Link>

            <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas py-1 pl-1 pr-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-900 text-[11px] font-bold text-white">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="hidden sm:block">
                <span className="block text-[12.5px] font-semibold leading-tight text-ink-900">{user.name}</span>
                <StatusPill status={user.role} className="mt-0.5 !px-1.5 !py-0 !text-[9.5px]" />
              </span>
              <form action={logoutAdminAction}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-sale-600"
                >
                  <LogOut size={15} />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 print:p-0">
          <FlashMessage />
          {children}
        </main>
      </div>
    </div>
  );
}
