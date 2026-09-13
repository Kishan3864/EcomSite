"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowUpRight, Clock, Search, Tag, TrendingUp, X } from "lucide-react";
import { searchDocs, type SearchDoc, type SearchHit } from "@/lib/search-index";
import { useStore } from "@/store/store";
import { cn, formatINR } from "@/lib/utils";
import { Form } from "@/components/ui/form";

/**
 * Everything the empty panel offers is read out of the same index the field
 * searches, rather than a hand-written list. A hand-written list goes stale the
 * moment the catalogue changes — and on a new store every term in it returns
 * nothing, which is the worst first impression a search box can make.
 */
function useSuggestions(docs: SearchDoc[]) {
  return useMemo(() => {
    const browse = docs
      .filter((d) => d.hit.type === "category")
      .slice(0, 6)
      .map((d) => d.hit);

    // Category names first (short, and they always match), then product names
    // to fill out the row on a catalogue that has more products than aisles.
    const terms: string[] = [];
    for (const type of ["category", "product"] as const) {
      for (const d of docs) {
        if (terms.length >= 8) break;
        if (d.hit.type !== type) continue;
        if (!terms.includes(d.hit.label)) terms.push(d.hit.label);
      }
    }

    const placeholders = terms.length
      ? terms.slice(0, 5).map((t) => `Search for ${t.toLowerCase()}`)
      : ["Search the store"];

    return { browse, terms, placeholders };
  }, [docs]);
}

export function SearchBar({
  docs,
  variant = "header",
  autoFocus = false,
  onNavigate,
  className,
}: {
  /** Prepared on the server so the catalogue stays out of the bundle. */
  docs: SearchDoc[];
  variant?: "header" | "sheet";
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(variant === "sheet");
  const [active, setActive] = useState(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const { recentSearches, dispatch } = useStore();
  const { browse, terms, placeholders } = useSuggestions(docs);

  const hits = useMemo(
    () => (term.trim() ? searchDocs(docs, term, 9) : []),
    [docs, term],
  );

  useEffect(() => {
    if (term || variant === "sheet") return;
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders.length),
      3600,
    );
    return () => clearInterval(id);
  }, [term, variant, placeholders.length]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (variant === "sheet") return;
    function onDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [variant]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string, record?: string) {
    if (record) dispatch({ type: "search/record", term: record });
    setOpen(variant === "sheet");
    setActive(-1);
    onNavigate?.();
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    if (active >= 0 && hits[active]) {
      go(hits[active].href, q);
      return;
    }
    go(`/search?q=${encodeURIComponent(q)}`, q);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  }

  const showPanel = open && (variant === "sheet" || true);

  return (
    <div
      ref={wrapper}
      // In the sheet the field stays pinned and only the suggestions scroll.
      className={cn("relative w-full", variant === "sheet" && "flex h-full flex-col", className)}
    >
      <Form onSubmit={submit} role="search">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border bg-surface px-3.5 transition-all duration-200",
            variant === "header" ? "h-11" : "h-12",
            open
              ? "border-brand-500 shadow-[0_0_0_3px_rgb(44_131_124/0.12)]"
              : "border-ink-200 hover:border-ink-300",
          )}
        >
          <Search size={17} className="shrink-0 text-ink-400" />
          <input
            ref={input}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            type="search"
            enterKeyHint="search"
            aria-label="Search products, brands and categories"
            aria-expanded={showPanel}
            aria-autocomplete="list"
            role="combobox"
            aria-controls="search-suggestions"
            placeholder={
              variant === "sheet"
                ? "Search WeekendCart"
                : placeholders[placeholderIndex % placeholders.length]
            }
            // 16px on phones, or iOS zooms the page into the field on focus.
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink-900 outline-none placeholder:text-ink-400 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                input.current?.focus();
              }}
              aria-label="Clear search"
              className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 sm:mr-0 sm:h-auto sm:w-auto sm:p-1"
            >
              <X size={15} />
            </button>
          )}
          {variant === "header" && !term && (
            <kbd className="hidden shrink-0 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-400 lg:block">
              Ctrl K
            </kbd>
          )}
        </div>
      </Form>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id="search-suggestions"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "z-50 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl",
              variant === "header"
                ? "absolute inset-x-0 top-[calc(100%+8px)]"
                : "mt-3 flex min-h-0 flex-col",
            )}
          >
            <div
              className={cn(
                "overflow-y-auto overscroll-contain",
                variant === "header" ? "max-h-[min(70dvh,560px)]" : "min-h-0",
              )}
            >
              {term.trim() ? (
                hits.length > 0 ? (
                  <ul role="listbox" className="p-1.5">
                    {hits.map((hit, i) => (
                      <SuggestionRow
                        key={`${hit.type}-${hit.href}-${i}`}
                        hit={hit}
                        active={i === active}
                        onSelect={() => go(hit.href, term.trim())}
                      />
                    ))}
                    <li>
                      <button
                        onClick={() => go(`/search?q=${encodeURIComponent(term.trim())}`, term.trim())}
                        className="tap mt-1 flex w-full items-center justify-between gap-3 rounded-lg border-t border-hairline px-3 py-3 text-left text-[12.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 sm:text-[13px]"
                      >
                        <span className="min-w-0 break-words">
                          See all results for &ldquo;{term.trim()}&rdquo;
                        </span>
                        <ArrowUpRight size={15} className="shrink-0" />
                      </button>
                    </li>
                  </ul>
                ) : (
                  <div className="px-4 py-6 text-center sm:px-5 sm:py-8">
                    <p className="break-words text-[13.5px] font-medium text-ink-900 sm:text-sm">
                      Nothing matched &ldquo;{term.trim()}&rdquo;
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-500 sm:text-xs">
                      Try a shorter term, or browse a category below.
                    </p>
                    {terms.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                        {terms.slice(0, 5).map((s) => (
                          <button
                            key={s}
                            onClick={() => setTerm(s)}
                            className="tap max-w-full truncate rounded-full border border-ink-200 px-3 py-1.5 text-[11.5px] text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700 sm:text-xs"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : recentSearches.length === 0 && browse.length === 0 && terms.length === 0 ? (
                // Nothing indexed yet — an empty panel with three headings and
                // no rows under them looks broken, so say what is true instead.
                <div className="px-4 py-6 text-center sm:px-5 sm:py-8">
                  <p className="text-[13.5px] font-medium text-ink-900 sm:text-sm">
                    There is nothing to search yet
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-500 sm:text-xs">
                    The first products go up shortly.
                  </p>
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  {recentSearches.length > 0 && (
                    <section className="mb-4 sm:mb-5">
                      <header className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          Recent searches
                        </h3>
                        {/* The negative margin gives a finger a real target
                            without moving the word. */}
                        <button
                          onClick={() => dispatch({ type: "search/clear" })}
                          className="-m-2 p-2 text-[11px] font-medium text-ink-400 hover:text-sale-600 lg:m-0 lg:p-0"
                        >
                          Clear
                        </button>
                      </header>
                      <ul className="flex flex-wrap gap-1.5">
                        {recentSearches.map((s) => (
                          <li key={s} className="min-w-0 max-w-full">
                            <button
                              onClick={() => go(`/search?q=${encodeURIComponent(s)}`, s)}
                              className="tap inline-flex max-w-full items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[11.5px] text-ink-700 transition-colors hover:bg-ink-200 sm:text-xs"
                            >
                              <Clock size={11} className="shrink-0" />
                              <span className="truncate">{s}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {browse.length > 0 && (
                    <section className="mb-4 sm:mb-5">
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                        Browse the store
                      </h3>
                      <ul className="grid grid-cols-2 gap-0.5">
                        {browse.map((t) => (
                          <li key={t.href} className="min-w-0">
                            <Link
                              href={t.href}
                              onClick={() => {
                                setOpen(variant === "sheet");
                                onNavigate?.();
                              }}
                              className="tap flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-brand-700 sm:gap-2.5 sm:px-2.5 sm:text-[13px]"
                            >
                              <TrendingUp size={13} className="shrink-0 text-brand-500" />
                              <span className="min-w-0 truncate">{t.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {terms.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                        Popular searches
                      </h3>
                      <ul className="flex flex-wrap gap-1.5">
                        {terms.map((s) => (
                          <li key={s} className="min-w-0 max-w-full">
                            <button
                              onClick={() => go(`/search?q=${encodeURIComponent(s)}`, s)}
                              className="tap inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-[11.5px] text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-700 sm:text-xs"
                            >
                              <Tag size={11} className="shrink-0" />
                              <span className="truncate">{s}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionRow({
  hit,
  active,
  onSelect,
}: {
  hit: SearchHit;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        onClick={onSelect}
        className={cn(
          "tap flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors sm:gap-3 sm:px-2.5 sm:py-2",
          active ? "bg-brand-50" : "hover:bg-ink-50",
        )}
      >
        {hit.image ? (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-ink-100 sm:h-11 sm:w-11">
            <Image src={hit.image} alt="" fill sizes="44px" className="object-cover" />
          </span>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 sm:h-11 sm:w-11">
            <Search size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink-900 sm:text-[13.5px]">
            {hit.label}
          </span>
          <span className="block truncate text-[11.5px] text-ink-500">{hit.sublabel}</span>
        </span>
        {hit.price != null && (
          <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-900 sm:text-[13px]">
            {formatINR(hit.price)}
          </span>
        )}
      </button>
    </li>
  );
}
