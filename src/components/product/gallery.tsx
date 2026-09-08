"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  const dialog = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const reduce = usePrefersReducedMotion();

  const slide = slides[index];
  const step = useCallback((delta: number) => {
    setIndex((i) => (i + delta + count) % count);
  }, [count]);

  useLockScroll(lightbox);
  useDialogFocus(lightbox, dialog);

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
      <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
        {/* Thumbnails */}
        <div className="rail gap-2 md:w-[74px] md:flex-col md:overflow-visible">
          {slides.map((s, i) => (
            <button
              key={s.url + i}
              onMouseEnter={() => setIndex(i)}
              onClick={() => setIndex(i)}
              aria-label={`View ${s.kind} ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-[68px] w-[58px] shrink-0 overflow-hidden rounded-lg border-2 bg-ink-100 transition-all duration-200 md:h-[86px] md:w-full",
                i === index
                  ? "border-brand-700"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={s.url} alt="" fill sizes="74px" className="object-cover" />
              {s.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
                  <Play size={16} className="text-white" fill="currentColor" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stage */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={stage}
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart.current == null) return;
              const dx = e.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
              touchStart.current = null;
            }}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-surface"
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

            {slide.kind === "video" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/45 backdrop-blur-[1px]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-ink-950 shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Play size={24} fill="currentColor" className="ml-1" />
                </span>
                <p className="text-[12.5px] font-medium text-white/85">
                  Product video — coming soon
                </p>
              </div>
            )}

            {/* Zoom affordance */}
            {slide.kind === "image" && (
              <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-[11px] font-medium text-ink-600 opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100 md:flex">
                <ZoomIn size={12} /> Hover to zoom
              </span>
            )}

            <button
              onClick={() => setLightbox(true)}
              aria-label="Open full screen"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink-600 shadow-sm backdrop-blur transition-colors hover:text-ink-950"
            >
              <Expand size={15} />
            </button>

            {count > 1 && (
              <>
                <button
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink-700 opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 hover:text-ink-950 group-hover:opacity-100 max-md:opacity-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink-700 opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 hover:text-ink-950 group-hover:opacity-100 max-md:opacity-100"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Mobile dots */}
          <div className="mt-3 flex justify-center gap-1.5 md:hidden">
            {slides.map((s, i) => (
              <button
                key={s.url + i}
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-brand-700" : "w-1.5 bg-ink-300",
                )}
              />
            ))}
          </div>
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
              className="fixed inset-0 z-[95] flex flex-col bg-ink-950/95 outline-none"
              onClick={() => setLightbox(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`${title} images`}
            >
              <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5">
                <p className="text-[13px] tabular-nums text-white/70">
                  {index + 1} of {count}
                </p>
                <button
                  onClick={() => setLightbox(false)}
                  aria-label="Close"
                  className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative min-h-0 flex-1 px-4 pb-5 sm:px-16">
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
                      className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-3"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        step(1);
                      }}
                      aria-label="Next image"
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-3"
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
                  className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {slides.map((s, i) => (
                    <button
                      key={s.url + i}
                      onClick={() => setIndex(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-current={i === index}
                      className={cn(
                        "relative h-14 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
                        i === index
                          ? "border-gold-400"
                          : "border-transparent opacity-50 hover:opacity-90",
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
