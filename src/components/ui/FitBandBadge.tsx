"use client";

import clsx from "clsx";
import { Sparkles, Leaf, Sun, Compass } from "lucide-react";
import { FIT_BAND_LABELS, type FitBand } from "@/lib/matching/types";

/**
 * Qualitative fit band — PRD explicitly forbids numeric/percentage display.
 * Each band has its own warm treatment; "kindred" gets the sparing gold.
 */

const STYLES: Record<FitBand, { cls: string; Icon: typeof Sparkles }> = {
  kindred: { cls: "bg-gold-400/20 text-terracotta-700 border-gold-400/50", Icon: Sparkles },
  strong: { cls: "bg-forest-600/10 text-forest-600 border-forest-500/30", Icon: Leaf },
  promising: { cls: "bg-terracotta-400/10 text-terracotta-600 border-terracotta-400/30", Icon: Sun },
  worth_exploring: { cls: "bg-sand-100 text-ink-soft border-sand-300", Icon: Compass },
};

export function FitBandBadge({
  band,
  limitedEvidence,
  className,
}: {
  band: FitBand;
  limitedEvidence?: boolean;
  className?: string;
}) {
  const { cls, Icon } = STYLES[band] ?? STYLES.worth_exploring;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-xs font-semibold",
        cls,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {FIT_BAND_LABELS[band] ?? "Worth exploring"}
      {limitedEvidence && <span className="font-normal opacity-70">· early read</span>}
    </span>
  );
}
