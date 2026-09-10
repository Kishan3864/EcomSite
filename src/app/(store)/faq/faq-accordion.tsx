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
    <div>
      <div className="mb-5 flex h-12 items-center gap-2.5 rounded-xl border border-ink-200 bg-surface px-4 transition-colors focus-within:border-brand-500">
        <Search size={17} className="shrink-0 text-ink-400" />
        <label htmlFor="faq-search" className="sr-only">
          Search the help centre
        </label>
        <input
          id="faq-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search — try 'refund' or 'delivery'"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
      </div>

      <div className="rail mb-7 gap-2">
        {["All", ...groups.map((g) => g.category)].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
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
        <div className="rounded-xl border border-dashed border-ink-200 px-6 py-14 text-center">
          <SearchX size={26} className="mx-auto text-ink-300" />
          <p className="mt-4 text-[15px] font-medium text-ink-900">
            Nothing matched &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Try a shorter word, or ask us directly — we answer within minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-9">
          {filtered.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
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
                        className="flex w-full items-start gap-4 py-4 text-left"
                      >
                        <span className="flex-1 text-[14.5px] font-medium leading-snug text-ink-900">
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
                            <p className="max-w-2xl pb-5 pr-8 text-[14px] leading-[1.7] text-ink-600">
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
