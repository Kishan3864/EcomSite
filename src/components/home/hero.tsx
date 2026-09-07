"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
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
      className="container-page pt-4 sm:pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="relative overflow-hidden rounded-2xl bg-brand-950 sm:rounded-3xl">
        <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/8]">
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
              "absolute inset-0 flex flex-col justify-end p-6 pb-16 sm:justify-center sm:p-10 sm:pb-10 lg:p-16",
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
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-300 backdrop-blur-sm">
                  {banner.eyebrow}
                </span>
                <h1 className="mt-4 font-display text-[30px] leading-[1.05] tracking-[-0.03em] text-white sm:text-[44px] lg:text-[56px]">
                  {banner.title}
                </h1>
                <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-white/70 sm:mt-4 sm:text-[15px]">
                  {banner.subtitle}
                </p>
                <div
                  className={cn(
                    "mt-6 flex flex-wrap items-center gap-3",
                    banner.align === "right" && "sm:justify-end",
                  )}
                >
                  <Link href={banner.href} className={buttonClasses("accent", "lg")}>
                    {banner.cta}
                    <ArrowRight size={17} />
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex h-13 items-center rounded-xl border border-white/25 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 flex items-center gap-2 sm:bottom-5 sm:left-10 lg:left-16">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className="group py-2"
              >
                <span
                  className={cn(
                    "block h-1 rounded-full transition-all duration-500",
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
