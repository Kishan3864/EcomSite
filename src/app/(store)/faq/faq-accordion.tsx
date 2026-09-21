"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Search } from "lucide-react";
import { PaperMark } from "@/components/illustration/paper-mark";
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
      {/* The wrapper owns the edge and the input inside it draws none --
          same arrangement as the masthead search, and for the same reason:
          with the base ring left on the input it came out as a box drawn
          inside a box. */}
      <div className="mb-3 flex h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3.5 transition-colors focus-within:border-brand-400 sm:mb-5 sm:h-12 sm:px-4">
        <Search size={16} className="shrink-0 text-ink-400" />
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
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink-900 outline-none placeholder:text-ink-400 sm:text-[14px]"
        />
      </div>

      {/* Runs edge to edge on phones, like any swipeable chip row. */}
      <div className="rail -mx-3 mb-5 gap-2 px-3 sm:mx-0 sm:mb-8 sm:px-0">
        {["All", ...groups.map((g) => g.category)].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "chip tap h-10 px-4 text-[12.5px] font-semibold transition-colors duration-200",
              category === c
                ? "border-brand-700 bg-brand-700 text-white"
                : "text-ink-600 hover:border-ink-300 hover:text-ink-950",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="card px-4 py-10 text-center sm:px-6 sm:py-14">
          <PaperMark size={120} className="mx-auto text-ink-300" />
          {/* break-words: the query is echoed back and may be one long word. */}
          <h2 className="mt-5 break-words font-display text-[20px] tracking-[-0.02em] text-ink-950">
            Nothing matched &ldquo;{query}&rdquo;
          </h2>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-[1.6] text-ink-500">
            Try a shorter word, or ask us directly — we answer within minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-7 sm:space-y-10">
          {filtered.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:mb-3">
                {group.category}
              </h2>
              <ul className="card card-divided overflow-hidden">
                {group.items.map((item) => {
                  const expanded = open === item.q;
                  return (
                    <li key={item.q}>
                      <button
                        onClick={() => setOpen(expanded ? null : item.q)}
                        aria-expanded={expanded}
                        // At least 44px per row on phones, a comfortable thumb target.
                        className="tap group flex min-h-11 w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50 sm:gap-4 sm:px-5 sm:py-4"
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[14px] font-medium leading-[1.4] transition-colors sm:text-[15px]",
                            expanded ? "text-ink-950" : "text-ink-900 group-hover:text-brand-700",
                          )}
                        >
                          {item.q}
                        </span>
                        <ChevronDown
                          size={16}
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
                            <p className="max-w-[68ch] px-4 pb-4 pr-6 text-[14px] leading-[1.75] text-ink-600 sm:px-5 sm:pb-5 sm:pr-8 sm:text-[15px]">
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
