"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowUpRight, Clock, Search, Tag, TrendingUp, X } from "lucide-react";
import { searchDocs, type SearchDoc, type SearchHit } from "@/lib/search-index";
import { popularSearches, trendingSearches } from "@/data/marketing";
import { useStore } from "@/store/store";
import { cn, formatINR } from "@/lib/utils";

const ROTATING = [
  "Search for cotton kurtas",
  "Search for wireless earbuds",
  "Search for triply kadai",
  "Search for running shoes",
  "Search for vitamin C serum",
];

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

  const hits = useMemo(
    () => (term.trim() ? searchDocs(docs, term, 9) : []),
    [docs, term],
  );

  useEffect(() => {
    if (term || variant === "sheet") return;
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % ROTATING.length),
      3600,
    );
    return () => clearInterval(id);
  }, [term, variant]);

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
    <div ref={wrapper} className={cn("relative w-full", className)}>
      <form onSubmit={submit} role="search">
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
            placeholder={variant === "sheet" ? "Search WeekendCart" : ROTATING[placeholderIndex]}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                input.current?.focus();
              }}
              aria-label="Clear search"
              className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
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
      </form>

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
              variant === "header" ? "absolute inset-x-0 top-[calc(100%+8px)]" : "mt-3",
            )}
          >
            <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain">
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
                        className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg border-t border-hairline px-3 py-3 text-left text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        See all results for &ldquo;{term.trim()}&rdquo;
                        <ArrowUpRight size={15} />
                      </button>
                    </li>
                  </ul>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm font-medium text-ink-900">
                      Nothing matched &ldquo;{term.trim()}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Try a shorter term, or browse a category below.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {popularSearches.slice(0, 5).map((s) => (
                        <button
                          key={s}
                          onClick={() => setTerm(s)}
                          className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4">
                  {recentSearches.length > 0 && (
                    <section className="mb-5">
                      <header className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          Recent searches
                        </h3>
                        <button
                          onClick={() => dispatch({ type: "search/clear" })}
                          className="text-[11px] font-medium text-ink-400 hover:text-sale-600"
                        >
                          Clear
                        </button>
                      </header>
                      <ul className="flex flex-wrap gap-1.5">
                        {recentSearches.map((s) => (
                          <li key={s}>
                            <button
                              onClick={() => go(`/search?q=${encodeURIComponent(s)}`, s)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs text-ink-700 transition-colors hover:bg-ink-200"
                            >
                              <Clock size={11} /> {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="mb-5">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Trending now
                    </h3>
                    <ul className="grid gap-0.5 sm:grid-cols-2">
                      {trendingSearches.map((t) => (
                        <li key={t.term}>
                          <Link
                            href={t.href}
                            onClick={() => {
                              setOpen(variant === "sheet");
                              onNavigate?.();
                            }}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-brand-700"
                          >
                            <TrendingUp size={13} className="text-brand-500" />
                            {t.term}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Popular searches
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {popularSearches.map((s) => (
                        <li key={s}>
                          <button
                            onClick={() => go(`/search?q=${encodeURIComponent(s)}`, s)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-700"
                          >
                            <Tag size={11} /> {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
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
          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
          active ? "bg-brand-50" : "hover:bg-ink-50",
        )}
      >
        {hit.image ? (
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-ink-100">
            <Image src={hit.image} alt="" fill sizes="44px" className="object-cover" />
          </span>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Search size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink-900">
            {hit.label}
          </span>
          <span className="block truncate text-[11.5px] text-ink-500">{hit.sublabel}</span>
        </span>
        {hit.price != null && (
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">
            {formatINR(hit.price)}
          </span>
        )}
      </button>
    </li>
  );
}
