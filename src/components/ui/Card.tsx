"use client";

import { type HTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import { motion, type HTMLMotionProps } from "framer-motion";

/** Soft rounded card — the base surface of the whole app. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx(
        "rounded-card border border-sand-200/80 bg-surface-raised shadow-soft",
        className
      )}
      {...rest}
    />
  );
});

/** Card that fades up gently as it enters — used for list items. */
export function MotionCard({
  className,
  delay = 0,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.21, 0.65, 0.36, 1] }}
      className={clsx(
        "rounded-card border border-sand-200/80 bg-surface-raised shadow-soft",
        className
      )}
      {...rest}
    />
  );
}
