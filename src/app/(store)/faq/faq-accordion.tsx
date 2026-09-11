"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  category: string;
  items: { q: string; a: string }[];
}

export function FaqAccordion({ groups }: { groups: Group[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(groups[0]?.items[0]?.q ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => category === "All" || g.category === category)
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter(
              (item) =>
                item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, category]);

  const total = filtered.reduce((sum, g) => sum + g.items.length, 0);

  return (
    // min-w-0: this is a grid column, and the chip rail's full width would
    // otherwise become its minimum and push the page sideways on a phone.
    <div className="min-w-0">
      <div className="mb-3 flex h-11 items-center gap-2.5 rounded-xl border border-ink-200 bg-surface px-3.5 transition-colors focus-within:border-brand-500 sm:mb-5 sm:h-12 sm:px-4">
        <Search size={17} className="shrink-0 text-ink-400" />
        <label htmlFor="faq-search" className="sr-only">
          Search the help centre
        </label>
        {/* 16px on phones: iOS zooms the page into any smaller field. */}
        <input
          id="faq-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search — try 'refund' or 'delivery'"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink-900 outline-none placeholder:text-ink-400 sm:text-sm"
        />
      </div>

      {/* Runs edge to edge on phones, like any swipeable chip row. */}
      <div className="rail -mx-3 mb-4 gap-2 px-3 sm:mx-0 sm:mb-7 sm:px-0">
        {["All", ...groups.map((g) => g.category)].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "tap h-10 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors sm:h-auto sm:text-[12.5px]",
              category === c
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center sm:px-6 sm:py-14">
          <SearchX size={26} className="mx-auto text-ink-300" />
          {/* break-words: the query is echoed back and may be one long word. */}
          <p className="mt-3 break-words text-[14px] font-medium text-ink-900 sm:mt-4 sm:text-[15px]">
            Nothing matched &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-500 sm:text-[13px]">
            Try a shorter word, or ask us directly — we answer within minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-9">
          {filtered.map((group) => (
            <section key={group.category}>
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-3">
                {group.category}
              </h2>
              <ul className="divide-y divide-hairline border-y border-hairline">
                {group.items.map((item) => {
                  const expanded = open === item.q;
                  return (
                    <li key={item.q}>
                      <button
                        onClick={() => setOpen(expanded ? null : item.q)}
                        aria-expanded={expanded}
                        // At least 44px per row on phones, a comfortable thumb target.
                        className="tap flex min-h-11 w-full items-start gap-3 py-3 text-left sm:min-h-0 sm:gap-4 sm:py-4"
                      >
                        <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-ink-900 sm:text-[14.5px]">
                          {item.q}
                        </span>
                        <ChevronDown
                          size={17}
                          className={cn(
                            "mt-0.5 shrink-0 text-ink-400 transition-transform duration-200",
                            expanded && "rotate-180",
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="max-w-2xl pb-4 pr-6 text-[13.5px] leading-[1.7] text-ink-600 sm:pb-5 sm:pr-8 sm:text-[14px]">
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
          ))}
        </div>
      )}
    </div>
  );
}
