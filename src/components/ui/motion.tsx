"use client";

import { motion, type Variants } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper. One shared easing curve keeps every section on the
 * page feeling like it belongs to the same product, and reduced-motion users
 * get the content with no transform at all.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = usePrefersReducedMotion();
  const Component = motion[as];

  return (
    <Component
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

/** Horizontal snap rail with edge fades — used for every product carousel. */
export function Rail({
  children,
  className,
  itemClassName,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn("rail -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8", itemClassName)}>
        {children}
      </div>
    </div>
  );
}
