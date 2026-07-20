"use client";

/**
 * Explainable compatibility panel (PRD §6): headline, why it may work,
 * useful complement, potential friction, best first outing. Tentative
 * language comes from the AI provider; this component just lays it out
 * with honest evidence labeling.
 */

import { HeartHandshake, Puzzle, CloudSun, Coffee, Info } from "lucide-react";
import type { MatchExplanation } from "@/lib/matching/types";

export function MatchInsight({ explanation }: { explanation: MatchExplanation }) {
  return (
    <div className="space-y-4">
      {explanation.limitedEvidence && (
        <p className="flex items-start gap-2 rounded-xl bg-sand-100 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          This is an early read — you both answered enough to start, but the picture will
          sharpen as your DNA fills in.
        </p>
      )}

      {explanation.whyItMayWork.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest-600">
            <HeartHandshake className="h-4 w-4" aria-hidden /> Why this may work
          </h4>
          <ul className="space-y-2">
            {explanation.whyItMayWork.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {explanation.usefulComplement && (
        <section>
          <h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-terracotta-600">
            <Puzzle className="h-4 w-4" aria-hidden /> A useful difference
          </h4>
          <p className="text-sm leading-relaxed text-ink">{explanation.usefulComplement}</p>
        </section>
      )}

      {explanation.potentialFriction && (
        <section>
          <h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
            <CloudSun className="h-4 w-4" aria-hidden /> May take patience
          </h4>
          <p className="text-sm leading-relaxed text-ink-soft">{explanation.potentialFriction}</p>
        </section>
      )}

      {explanation.bestFirstOuting && (
        <section className="rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-3">
          <h4 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-terracotta-700">
            <Coffee className="h-4 w-4" aria-hidden /> A good first outing
          </h4>
          <p className="text-sm leading-relaxed text-ink">{explanation.bestFirstOuting}</p>
        </section>
      )}
    </div>
  );
}
