"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  tone?: "neutral" | "forest";
}

/** Selectable pill — filters, multi-select answers, tag pickers. */
export function Chip({ selected, icon, tone = "neutral", className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-medium",
        "transition-all duration-200 active:scale-[0.97]",
        selected
          ? tone === "forest"
            ? "border-forest-600 bg-forest-600 text-sand-50 shadow-soft"
            : "border-terracotta-500 bg-terracotta-500 text-sand-50 shadow-soft"
          : "border-sand-300 bg-surface-raised text-ink-soft hover:border-terracotta-400 hover:text-ink",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Static, non-interactive tag (languages, categories, etc.). */
export function Tag({
  children,
  className,
  tone = "sand",
}: {
  children: ReactNode;
  className?: string;
  tone?: "sand" | "forest" | "gold";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold",
        tone === "sand" && "bg-sand-100 text-ink-soft",
        tone === "forest" && "bg-forest-600/10 text-forest-600",
        tone === "gold" && "bg-gold-400/15 text-terracotta-700",
        className
      )}
    >
      {children}
    </span>
  );
}
