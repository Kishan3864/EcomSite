"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6500;

export function Hero({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = usePrefersReducedMotion();

  const go = useCallback(
    (next: number) => setIndex(((next % banners.length) + banners.length) % banners.length),
    [banners.length],
  );

  useEffect(() => {
    if (paused || reduce || banners.length < 2) return;
    const id = setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [index, paused, reduce, banners.length, go]);

  const banner = banners[index];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      {/* Full-bleed. Boxing the hero inside the page gutter and rounding it
          made it read as one more card; edge to edge it reads as a window. */}
      <div className="relative overflow-hidden bg-brand-950">
        {/* Phones size the hero from its copy (with a floor) rather than a
            ratio, so a long headline grows the band instead of being clipped. */}
        <div className="relative sm:aspect-[16/9] lg:aspect-[21/9]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={banner.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={banner.image.url}
                alt={banner.image.alt}
                fill
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          <div
            className={cn(
              "absolute inset-0",
              banner.align === "left"
                ? "bg-gradient-to-r from-brand-950 via-brand-950/85 to-brand-950/10"
                : "bg-gradient-to-l from-brand-950 via-brand-950/85 to-brand-950/10",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent sm:hidden" />

          <div
            className={cn(
              "container-page relative flex min-h-[320px] flex-col justify-end pb-12 pt-8 sm:absolute sm:inset-0 sm:min-h-0 sm:justify-center sm:pb-0 sm:pt-0",
              banner.align === "right" && "sm:items-end sm:text-right",
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={banner.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                className={cn("max-w-xl", banner.align === "right" && "sm:ml-auto")}
              >
                {/* A rule and small caps, not a frosted pill. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300",
                    banner.align === "right" && "sm:flex-row-reverse",
                  )}
                >
                  <span className="h-px w-7 bg-gold-400" />
                  {banner.eyebrow}
                </span>
                <h1 className="mt-3 font-display text-[24px] leading-[1.02] tracking-[-0.035em] text-white sm:mt-5 sm:text-[50px] lg:text-[64px]">
                  {banner.title}
                </h1>
                <p className="mt-2 line-clamp-2 max-w-md text-[13px] leading-[1.55] text-white/65 sm:mt-5 sm:line-clamp-none sm:text-[15px] sm:leading-[1.7]">
                  {banner.subtitle}
                </p>
                {/* On phones the two actions grow to fill the row, so when a
                    long label pushes one onto its own line both read as
                    full-width buttons rather than a ragged pair. */}
                <div
                  className={cn(
                    "mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3",
                    banner.align === "right" && "sm:justify-end",
                  )}
                >
                  <Link
                    href={banner.href}
                    className="tap inline-flex h-10 grow items-center justify-center gap-2 bg-gold-400 px-5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
                  >
                    {banner.cta}
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/products"
                    className="tap inline-flex h-10 grow items-center justify-center border border-white/30 px-5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-ink-950 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
                  >
                    Browse everything
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="absolute bottom-5 right-5 hidden items-center gap-2 sm:flex">
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="flex h-10 w-10 items-center justify-center border border-white/25 text-white transition-colors hover:border-white hover:bg-white hover:text-ink-950"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="flex h-10 w-10 items-center justify-center border border-white/25 text-white transition-colors hover:border-white hover:bg-white hover:text-ink-950"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* On phones each dash sits in a hit area about 40px square — the
              arrows are hidden there, so these are the only manual control. */}
          <div className="container-page absolute inset-x-0 bottom-0 flex items-center sm:bottom-5 sm:gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className="group flex h-10 items-center px-3 first:pl-0 sm:block sm:h-auto sm:px-0 sm:py-2"
              >
                <span
                  className={cn(
                    "block h-[3px] transition-all duration-500",
                    i === index ? "w-8 bg-gold-400" : "w-4 bg-white/35 group-hover:bg-white/60",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
