"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Check, Heart, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastInput {
  title: string;
  description?: string;
  image?: string;
  tone?: "success" | "info" | "wishlist";
  action?: { label: string; href: string };
  duration?: number;
}

interface Toast extends ToastInput {
  id: number;
}

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduce = usePrefersReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-2), { ...input, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), input.duration ?? 3800),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end sm:px-0"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-ink-800/10 bg-ink-950/95 text-white shadow-xl backdrop-blur-md"
            >
              <div className="flex items-start gap-3 p-3">
                {t.image ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    <Image src={t.image} alt="" fill sizes="44px" className="object-cover" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      t.tone === "wishlist"
                        ? "bg-sale-500/20 text-sale-500"
                        : t.tone === "info"
                          ? "bg-white/10 text-white"
                          : "bg-brand-400/20 text-brand-300",
                    )}
                  >
                    {t.tone === "wishlist" ? (
                      <Heart size={15} fill="currentColor" />
                    ) : t.tone === "info" ? (
                      <Info size={15} />
                    ) : (
                      <Check size={15} strokeWidth={2.5} />
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/65">
                      {t.description}
                    </p>
                  )}
                  {t.action && (
                    <Link
                      href={t.action.href}
                      onClick={() => dismiss(t.id)}
                      className="mt-2 inline-block text-xs font-semibold text-gold-300 underline-offset-2 hover:underline"
                    >
                      {t.action.label}
                    </Link>
                  )}
                </div>

                <button
                  onClick={() => dismiss(t.id)}
                  className="-m-1 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
