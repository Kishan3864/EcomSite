"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ChevronLeft, ChevronRight, Expand, Play, X, ZoomIn } from "lucide-react";
import type { ImageAsset } from "@/lib/types";
import { Portal } from "@/components/ui/portal";
import { useDialogFocus, useLockScroll } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

interface Slide {
  kind: "image" | "video";
  url: string;
  alt: string;
}

export function Gallery({
  images,
  videoPoster,
  title,
}: {
  images: ImageAsset[];
  videoPoster?: string;
  title: string;
}) {
  const slides: Slide[] = [
    ...images.map((i) => ({ kind: "image" as const, url: i.url, alt: i.alt })),
    ...(videoPoster
      ? [{ kind: "video" as const, url: videoPoster, alt: `${title} — product video` }]
      : []),
  ];

  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  // The slide the phone track says it is over; -1 while the gallery moves it.
  const reported = useRef(0);
  const reduce = usePrefersReducedMotion();

  const slide = slides[index];
  const step = useCallback((delta: number) => {
    setIndex((i) => (i + delta + count) % count);
  }, [count]);

  useLockScroll(lightbox);
  useDialogFocus(lightbox, dialog);

  // Phones swipe a native snap track, which reports the slide it is over. When
  // the index moves any other way — a dot, the lightbox — bring the track
  // along. An index the track itself reported is left alone, or the nudge would
  // fight the scroll that produced it.
  useEffect(() => {
    const el = track.current;
    if (!el || !el.clientWidth || reported.current === index) return;
    reported.current = -1;
    el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, [index, reduce]);

  function onTrackScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    if (i === reported.current) return;
    reported.current = i;
    setIndex(i);
  }

  // A one-finger flick past 45px steps a slide, on the stage and in the
  // lightbox alike. A second finger is a pinch, not a swipe.
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStart.current = e.touches.length === 1 ? e.touches[0].clientX : null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStart.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStart.current;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      touchStart.current = null;
    },
  };

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, step]);

  function onMove(e: React.MouseEvent) {
    if (slide.kind !== "image") return;
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <>
      {/* `min-w-0` is load-bearing. Without it this flex box takes its
          min-content width from the horizontal snap track inside it and sits a
          few pixels wider than the grid column it is in — which the mobile
          track's -mx-3 full-bleed then doubles, putting the whole product page
          into a horizontal scroll at 320px. */}
      <div className="flex min-w-0 flex-col-reverse gap-3 md:flex-row md:gap-4">
        {/* Thumbnails — phones swipe the photos themselves instead. A row that
            scrolls below 768px, a column beside the stage above it.

            `auto-rows` and `self-start` are the whole fix for a column that
            used to fall down the page: as a stretched flex child the grid took
            the stage's full height and split it between however many
            thumbnails there were, so two photos sat at the top and bottom of a
            700px column with a canyon between them. The rows are now the
            thumbnail's own height and the column stops where they do. */}
        <div className="hidden grid-flow-col auto-cols-[58px] gap-2 overflow-x-auto no-scrollbar sm:grid md:w-[74px] md:auto-rows-[86px] md:grid-flow-row md:auto-cols-auto md:self-start md:overflow-visible">
          {slides.map((s, i) => (
            <button
              key={s.url + i}
              onMouseEnter={() => setIndex(i)}
              onClick={() => setIndex(i)}
              aria-label={`View ${s.kind} ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-[68px] w-full overflow-hidden rounded-lg bg-ink-50 transition-all duration-200 md:h-[86px]",
                i === index
                  ? "opacity-100 ring-2 ring-brand-700 ring-offset-1"
                  : "opacity-70 ring-1 ring-hairline hover:opacity-100",
              )}
            >
              <Image src={s.url} alt="" fill sizes="74px" className="object-cover" />
              {s.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-brand-950/45">
                  <Play size={16} className="text-white" fill="currentColor" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Phones: every photo on a snap track that runs edge to edge and
              follows the thumb, the way a shopping app's gallery does. The
              sizes match the stage's, so the first photo is fetched once. */}
          <div className="relative -mx-3 sm:hidden">
            <div
              ref={track}
              onScroll={onTrackScroll}
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-surface"
            >
              {slides.map((s, i) => (
                <div
                  key={s.url + i}
                  className="relative aspect-[4/5] w-full shrink-0 snap-center snap-always"
                >
                  <Image
                    src={s.url}
                    alt={s.alt}
                    fill
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    sizes="(min-width:1024px) 42vw, 100vw"
                    className="object-cover"
                  />
                  {s.kind === "video" && <VideoNotice />}
                </div>
              ))}
            </div>

            <button
              onClick={() => setLightbox(true)}
              aria-label="Open full screen"
              className="tap absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg border border-hairline bg-surface/95 text-ink-700 backdrop-blur"
            >
              <Expand size={16} />
            </button>
          </div>

          {/* Stage */}
          <div
            ref={stage}
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            {...swipe}
            className="group relative hidden aspect-[4/5] overflow-hidden rounded-xl border border-hairline bg-surface sm:block"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.url + index}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <Image
                  src={slide.url}
                  alt={slide.alt}
                  fill
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  sizes="(min-width:1024px) 42vw, 100vw"
                  className={cn(
                    "object-cover transition-transform duration-200",
                    zoom && slide.kind === "image" && "scale-[2.1]",
                  )}
                  style={
                    zoom && slide.kind === "image"
                      ? { transformOrigin: `${zoom.x}% ${zoom.y}%` }
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>

            {slide.kind === "video" && <VideoNotice />}

            {/* Zoom affordance */}
            {slide.kind === "image" && (
              <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-lg border border-hairline bg-surface/95 px-2.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100 md:flex">
                <ZoomIn size={12} className="text-ink-400" /> Hover to zoom
              </span>
            )}

            <button
              onClick={() => setLightbox(true)}
              aria-label="Open full screen"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface/95 text-ink-700 backdrop-blur transition-colors duration-200 hover:bg-ink-950 hover:text-white"
            >
              <Expand size={15} />
            </button>

            {/* Hover reveals the arrows; a touch screen has no hover, so there
                they simply show. */}
            {count > 1 && (
              <>
                <button
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-surface/95 text-ink-700 opacity-0 backdrop-blur transition-opacity duration-200 hover:text-ink-950 group-hover:opacity-100 max-md:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-surface/95 text-ink-700 opacity-0 backdrop-blur transition-opacity duration-200 hover:text-ink-950 group-hover:opacity-100 max-md:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Position dots: over the photo on phones, where they cost no
              height, and under the stage on small tablets. */}
          {count > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center sm:pointer-events-auto sm:static sm:mt-3 md:hidden">
              <div className="pointer-events-auto flex gap-1.5 bg-surface/90 px-2 py-1.5 sm:bg-transparent sm:p-0">
                {slides.map((s, i) => (
                  <button
                    key={s.url + i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={cn(
                      "h-1.5 transition-all duration-300",
                      i === index ? "w-6 bg-ink-950" : "w-1.5 bg-ink-300",
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Portal>
        <AnimatePresence>
          {lightbox && (
            <motion.div
              ref={dialog}
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[95] flex flex-col bg-brand-950/95 outline-none"
              onClick={() => setLightbox(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`${title} images`}
            >
              {/* Full screen, so clear of the notch and the home indicator. */}
              <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] tabular-nums text-white/70">
                  {index + 1} of {count}
                </p>
                <button
                  onClick={() => setLightbox(false)}
                  aria-label="Close"
                  className="border border-white/25 bg-white/10 p-2.5 text-white transition-colors duration-200 hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>

              <div {...swipe} className="relative min-h-0 flex-1 pb-3 sm:px-16 sm:pb-5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.url + index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={slide.url}
                      alt={slide.alt}
                      fill
                      sizes="100vw"
                      className="object-contain"
                    />
                  </motion.div>
                </AnimatePresence>

                {count > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        step(-1);
                      }}
                      aria-label="Previous image"
                      className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 sm:left-3"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        step(1);
                      }}
                      aria-label="Next image"
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 sm:right-3"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Stepping one at a time through eight photographs to reach the
                  last one is why the thumbnails belong here too. */}
              {count > 1 && (
                <div
                  className="flex shrink-0 justify-center-safe gap-2 overflow-x-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center sm:px-4 sm:pb-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {slides.map((s, i) => (
                    <button
                      key={s.url + i}
                      onClick={() => setIndex(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-current={i === index}
                      className={cn(
                        // White, not ember: the accent is spent on the page
                        // itself, and a lit frame reads as "this one" anyway.
                        "relative h-14 w-12 shrink-0 overflow-hidden rounded-md transition-all duration-200",
                        i === index
                          ? "opacity-100 ring-2 ring-white"
                          : "opacity-50 hover:opacity-90",
                      )}
                    >
                      <Image src={s.url} alt="" fill sizes="48px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

/** The video slide is only a poster for now, and says so. */
function VideoNotice() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-950/50 backdrop-blur-[1px]">
      <span className="flex h-16 w-16 items-center justify-center bg-white text-ink-950 transition-transform duration-300 group-hover:scale-[1.03]">
        <Play size={24} fill="currentColor" className="ml-1" />
      </span>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/85">
        Product video — coming soon
      </p>
    </div>
  );
}
