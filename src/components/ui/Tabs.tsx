"use client";

import clsx from "clsx";
import { motion } from "framer-motion";

/** Segmented tab control with a sliding active pill. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex w-full items-center gap-1 rounded-pill border border-sand-200 bg-surface-sunken p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={clsx(
              "relative flex-1 rounded-pill px-3 py-2 text-sm font-semibold transition-colors duration-200",
              active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-pill bg-surface-raised shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative">
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span className="ml-1.5 rounded-pill bg-terracotta-500 px-1.5 py-0.5 text-[10px] font-bold text-sand-50">
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
