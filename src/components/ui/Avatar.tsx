"use client";

import clsx from "clsx";

/**
 * Deterministic illustrated avatar. We never use photos in the MVP — each
 * person gets a warm gradient "soul stone" derived from their avatarSeed,
 * with their initial set in the editorial serif.
 */

const PALETTES: [string, string][] = [
  ["#d08060", "#c19848"], // terracotta → gold
  ["#4a6c56", "#6a8a74"], // forest
  ["#b96444", "#e0a084"], // clay
  ["#6a8a74", "#c7ad86"], // sage → sand
  ["#9e5034", "#d6b26a"], // rust → honey
  ["#345440", "#b96444"], // deep forest → terracotta
  ["#c7ad86", "#d08060"], // sand → clay
  ["#803e28", "#4a6c56"], // umber → forest
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

export function Avatar({
  seed,
  name,
  size = "md",
  className,
}: {
  seed: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const h = hashSeed(seed);
  const [from, to] = PALETTES[h % PALETTES.length];
  const angle = (h >> 3) % 360;
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      aria-hidden
      className={clsx(
        "organic-blob inline-flex select-none items-center justify-center font-display font-semibold text-sand-50 shadow-soft",
        SIZES[size],
        className
      )}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` }}
    >
      {initial}
    </span>
  );
}
