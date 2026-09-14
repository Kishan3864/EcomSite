"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Route-level entrance animation.
 *
 * Deliberately entrance-only: exit animations would have to hold the previous
 * route in the tree while the next one streams in, which delays the first
 * paint of the page the customer actually asked for.
 *
 * 280ms and 8px are the house motion budget, and a route change is the one
 * movement a customer sees on every single navigation — so it is the place the
 * budget matters most. Anything longer reads as the site thinking about it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = usePrefersReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
