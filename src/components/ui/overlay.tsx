"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

/** Also used by the product lightbox, which needs the lock without the chrome. */
export function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [active]);
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onClose]);
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Focus moves into the dialog when it opens and back to whatever opened it when
 * it closes, and Tab stays inside meanwhile. Content that focuses itself — the
 * search sheet's input — runs its own effect first and is left alone; there is
 * then no opener outside the dialog to hand focus back to.
 */
export function useDialogFocus(active: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;

    const opener = document.activeElement;
    const selfFocused = dialog.contains(opener);
    if (!selfFocused) dialog.focus({ preventScroll: true });

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const stops = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      const here = document.activeElement;
      // The wrapper itself holds focus until the first Tab, and it is portalled
      // to the end of <body>, so letting shift-Tab off it run would drop focus
      // into the page behind the overlay.
      const inside = here !== dialog && dialog.contains(here);
      if (inside && here !== (e.shiftKey ? first : last)) return;
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (!selfFocused && opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [active, ref]);
}

const SIDE_STYLES = {
  right: { class: "inset-y-0 right-0 h-full", axis: "x", from: "100%" },
  left: { class: "inset-y-0 left-0 h-full", axis: "x", from: "-100%" },
  bottom: { class: "inset-x-0 bottom-0 w-full rounded-t-2xl", axis: "y", from: "100%" },
} as const;

export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  description,
  className,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  side?: keyof typeof SIDE_STYLES;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  useLockScroll(open);
  useEscape(open, onClose);
  useDialogFocus(open, dialog);

  const meta = SIDE_STYLES[side];
  const hidden = meta.axis === "x" ? { x: meta.from } : { y: meta.from };
  const shown = meta.axis === "x" ? { x: 0 } : { y: 0 };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div
            ref={dialog}
            tabIndex={-1}
            className="fixed inset-0 z-[80] outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={onClose}
              className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={reduce ? { opacity: 0 } : hidden}
              animate={reduce ? { opacity: 1 } : shown}
              exit={reduce ? { opacity: 0 } : hidden}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className={cn(
                "absolute flex flex-col bg-canvas shadow-xl",
                meta.class,
                side !== "bottom" && "w-full max-w-md",
                side === "bottom" && "max-h-[88vh]",
                className,
              )}
            >
              {side === "bottom" && (
                <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink-300" />
              )}
              {title && (
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
                  <div>
                    <h2 className="font-display text-lg tracking-[-0.01em] text-ink-950">{title}</h2>
                    {description && (
                      <p className="mt-0.5 text-xs text-ink-500">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-m-1.5 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                  >
                    <X size={18} />
                  </button>
                </header>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
              {footer && (
                <div className="shrink-0 border-t border-hairline bg-surface px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Modal({
  open,
  onClose,
  title,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  useLockScroll(open);
  useEscape(open, onClose);
  useDialogFocus(open, dialog);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div
            ref={dialog}
            tabIndex={-1}
            className="fixed inset-0 z-[85] flex items-end justify-center p-0 outline-none sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className={cn(
                "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-canvas shadow-xl sm:max-w-2xl sm:rounded-2xl",
                className,
              )}
            >
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 rounded-full bg-surface/90 p-2 text-ink-600 shadow-sm backdrop-blur transition-colors hover:text-ink-950"
              >
                <X size={16} />
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
