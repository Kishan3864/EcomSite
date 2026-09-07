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
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
