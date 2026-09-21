"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleHelp,
  CreditCard,
  Package,
  Plus,
  Search,
  SearchX,
  RotateCcw,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

interface Group {
  category: string;
  items: { q: string; a: string }[];
}

const GROUP_ICONS: Record<string, LucideIcon> = {
  Orders: ShoppingBag,
  Delivery: Truck,
  Payments: CreditCard,
  "Returns and refunds": RotateCcw,
  Products: Package,
};

/** Anchor id for a category section; the page builds the same ids for its jump list. */
function faqGroupId(category: string) {
  return `faq-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function FaqAccordion({ groups }: { groups: Group[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(groups[0]?.items[0]?.q ?? null);
  const reduced = usePrefersReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => category === "All" || g.category === category)
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter(
              (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, category]);

  const total = filtered.reduce((sum, g) => sum + g.items.length, 0);

  return (
    // min-w-0: a grid column; the chip rail would otherwise push the page sideways.
    <div className="min-w-0">
      {/* The wrapper draws the field; the input inside draws none. */}
      <div className="mb-3 flex h-12 items-center gap-2.5 rounded-md bg-surface px-3.5 shadow-xs ring-1 ring-inset ring-line-strong transition-shadow focus-within:shadow-(--shadow-glow) focus-within:ring-brand-500 sm:mb-4 sm:px-4">
        <Search size={16} aria-hidden className="shrink-0 text-ink-500" />
        <label htmlFor="faq-search" className="sr-only">
          Search the help centre
        </label>
        {/* 16px on phones: iOS zooms into smaller fields. */}
        <input
          id="faq-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search — try 'refund' or 'delivery'"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink-900 shadow-none outline-none placeholder:text-ink-400 focus:shadow-none sm:text-[14px]"
        />
      </div>

      <div className="rail -mx-3 mb-6 gap-2 px-3 sm:mx-0 sm:mb-8 sm:flex-wrap sm:overflow-visible sm:px-0">
        {["All", ...groups.map((g) => g.category)].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "chip tap h-9 shrink-0 whitespace-nowrap px-3.5 text-[12.5px] font-semibold transition-colors duration-200",
              category === c
                ? "bg-brand-700 text-white"
                : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="card relative overflow-hidden px-4 py-12 text-center sm:px-6 sm:py-16">
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <SearchX size={24} aria-hidden />
          </span>
          {/* break-words: the query is echoed back and may be one long word. */}
          <h2 className="t-h2 relative mt-5 break-words">Nothing matched &ldquo;{query}&rdquo;</h2>
          <p className="t-body relative mx-auto mt-2 max-w-[46ch]">
            Try a shorter word, or ask us directly — we answer within minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {filtered.map((group, gi) => {
            const Icon = GROUP_ICONS[group.category] ?? CircleHelp;
            const id = faqGroupId(group.category);
            return (
              <section key={group.category} id={id} aria-labelledby={`${id}-h`} className="scroll-mt-(--sticky-top)">
                <div className="mb-3 flex items-center gap-3 sm:mb-4">
                  <span className="icon-tile">
                    <Icon size={20} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 id={`${id}-h`} className="t-h2">
                      {group.category}
                    </h2>
                    <p className="t-small tabular-nums">
                      {group.items.length} {group.items.length === 1 ? "question" : "questions"}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {group.items.map((item, i) => {
                    const expanded = open === item.q;
                    const panelId = `faq-${gi}-${i}`;
                    return (
                      <li
                        key={item.q}
                        className={cn(
                          "card overflow-hidden transition-[border-color,box-shadow] duration-200",
                          expanded && "border-brand-200 shadow-md",
                        )}
                      >
                        <h3>
                          <button
                            type="button"
                            id={`${panelId}-btn`}
                            onClick={() => setOpen(expanded ? null : item.q)}
                            aria-expanded={expanded}
                            aria-controls={panelId}
                            className="tap group flex min-h-12 w-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-5 sm:py-4"
                          >
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-[14px] font-semibold leading-[1.4] tracking-[-0.01em] transition-colors",
                                expanded ? "text-ink-950" : "text-ink-900 group-hover:text-brand-700",
                              )}
                            >
                              {item.q}
                            </span>
                            <span
                              aria-hidden
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200",
                                expanded
                                  ? "rotate-45 bg-brand-700 text-white"
                                  : "bg-ink-100 text-ink-600 group-hover:bg-brand-50 group-hover:text-brand-700",
                              )}
                            >
                              <Plus size={14} />
                            </span>
                          </button>
                        </h3>
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              id={panelId}
                              role="region"
                              aria-labelledby={`${panelId}-btn`}
                              initial={reduced ? false : { height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                              transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <p className="t-body max-w-[68ch] px-4 pb-4 pr-12 sm:px-5 sm:pb-5 sm:pr-14">
                                {item.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
