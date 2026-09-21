"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play, ShoppingBag, Star, TrendingUp } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { fromCard, useCommerce } from "@/store/commerce";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";

const INTERVAL_MS = 6500;

/**
 * The home hero: the top of the ranking engine's trending shelf, one product
 * per slide. Autoplays (never under reduced motion), pauses on hover, focus
 * or the pause button, swipes on touch and answers the arrow keys.
 */
export function HeroSlider({
  slides,
  label,
  tag,
}: {
  slides: ProductCardModel[];
  label: string;
  /** "Trending" when the ranking had sales or views to go on, "Featured" when not. */
  tag: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);
  const { addToCart } = useCommerce();

  const count = slides.length;
  const paused = userPaused || hovering || reduce || count < 2;

  const go = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => go(index + 1, 1), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [paused, index, go]);

  if (count === 0) return null;
  const slide = slides[index];
  const off = discountPercent(slide.mrp, slide.price);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(index + 1, 1);
    else if (e.key === "ArrowLeft") go(index - 1, -1);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="container-page pt-4 sm:pt-6"
      onKeyDown={onKeyDown}
    >
      <div
        className="aurora relative overflow-hidden rounded-3xl border border-line"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setHovering(true)}
        onBlurCapture={() => setHovering(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }}
      >
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-iris-200/50 blur-3xl motion-safe:animate-float"
        />

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            custom={direction}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid min-h-[520px] grid-rows-[auto_1fr] gap-6 p-5 pb-16 sm:min-h-[440px] sm:p-8 sm:pb-16 md:grid-cols-[1.05fr_1fr] md:grid-rows-1 md:items-center md:gap-10 lg:min-h-[460px] lg:p-12 lg:pb-16"
          >
            {/* Copy */}
            <div className="order-2 flex flex-col md:order-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 backdrop-blur">
                <TrendingUp size={14} />
                {tag} #{index + 1}
                {slide.brand && <span className="text-ink-500">· {slide.brand}</span>}
              </span>
              <h1 className="t-display mt-4 line-clamp-3 max-w-[18ch]">{slide.title}</h1>
              {slide.subtitle && <p className="t-body mt-3 line-clamp-2 max-w-[48ch]">{slide.subtitle}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-baseline gap-2">
                  <span className="t-price text-[26px] sm:text-[30px]">{formatINR(slide.price)}</span>
                  {slide.mrp > slide.price && (
                    <span className="text-[14px] text-ink-400 line-through tabular-nums">{formatINR(slide.mrp)}</span>
                  )}
                </span>
                {off > 0 && (
                  <span className="rounded-full bg-sale-600 px-2.5 py-1 text-[11.5px] font-semibold text-white">
                    {off}% off
                  </span>
                )}
                {slide.reviewCount > 0 && slide.rating > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-600">
                    <Star size={14} className="text-gold-500" fill="currentColor" strokeWidth={0} />
                    <span className="font-semibold text-ink-900">{slide.rating.toFixed(1)}</span>
                    ({formatCompact(slide.reviewCount)} reviews)
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href={`/p/${slide.slug}`}
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink-950 px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  Shop now
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                {slide.stock > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(fromCard(slide));
                      setAdded(slide.id);
                      setTimeout(() => setAdded(null), 1600);
                    }}
                    className={cn(
                      "inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13.5px] font-semibold transition-colors",
                      added === slide.id ? "bg-brand-700 text-white" : "bg-gold-400 text-ink-950 hover:bg-gold-300",
                    )}
                  >
                    {added === slide.id ? <Check size={16} /> : <ShoppingBag size={16} />}
                    {added === slide.id ? "Added" : "Add to bag"}
                  </button>
                )}
              </div>
            </div>

            {/* Product */}
            <Link
              href={`/p/${slide.slug}`}
              tabIndex={-1}
              aria-hidden
              className="relative order-1 mx-auto block aspect-square w-full max-w-[260px] sm:max-w-[320px] md:order-2 md:max-w-[400px]"
            >
              <span className="absolute inset-[6%] rounded-[32%] bg-surface/70 shadow-xl ring-1 ring-white/60 backdrop-blur" />
              <span className="absolute inset-[10%] overflow-hidden rounded-[28%]">
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(min-width:768px) 400px, 320px"
                  className="object-cover"
                />
              </span>
            </Link>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <div className="absolute inset-x-5 bottom-4 flex items-center justify-between gap-4 sm:inset-x-8 lg:inset-x-12">
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Show slide ${i + 1}: ${s.title}`}
                  aria-current={i === index}
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-full transition-all duration-300",
                    i === index ? "w-10 bg-ink-950/15" : "w-4 bg-ink-950/15 hover:bg-ink-950/30",
                  )}
                >
                  {i === index && (
                    <span
                      key={`${index}-${paused}`}
                      className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-brand-700"
                      style={
                        paused
                          ? undefined
                          : { animation: `hero-progress ${INTERVAL_MS}ms linear forwards` }
                      }
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <SliderButton label="Previous slide" onClick={() => go(index - 1, -1)}>
                <ChevronLeft size={18} />
              </SliderButton>
              {!reduce && (
                <SliderButton
                  label={userPaused ? "Play slideshow" : "Pause slideshow"}
                  onClick={() => setUserPaused((p) => !p)}
                  pressed={userPaused}
                >
                  {userPaused ? <Play size={16} /> : <Pause size={16} />}
                </SliderButton>
              )}
              <SliderButton label="Next slide" onClick={() => go(index + 1, 1)}>
                <ChevronRight size={18} />
              </SliderButton>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes hero-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </section>
  );
}

function SliderButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="glass flex h-9 w-9 items-center justify-center rounded-full text-ink-800 ring-1 ring-inset ring-ink-950/10 transition-colors hover:text-brand-700"
    >
      {children}
    </button>
  );
}
