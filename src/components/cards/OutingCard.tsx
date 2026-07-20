"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Users, Lock } from "lucide-react";
import { MotionCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Chip";
import { CATEGORY_EMOJI, CATEGORY_LABELS, BUDGET_LABELS, formatSingapore } from "@/lib/utils";
import type { SerializedOuting } from "@/lib/server/serializers";

/** Outing card for Discover, Soul Drop suggestions and "my outings". */
export function OutingCard({ outing, delay = 0 }: { outing: SerializedOuting; delay?: number }) {
  const started = outing.startsAt <= Date.now();
  return (
    <MotionCard delay={delay} className="overflow-hidden">
      <Link href={`/outings/${outing.id}`} className="block p-5 transition-colors hover:bg-sand-50/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="organic-blob flex h-11 w-11 shrink-0 items-center justify-center bg-sand-100 text-xl"
            >
              {CATEGORY_EMOJI[outing.category] ?? "🌿"}
            </span>
            <div>
              <p className="text-xs font-semibold text-terracotta-600">
                {CATEGORY_LABELS[outing.category] ?? outing.category}
              </p>
              <h3 className="font-display text-[17px] font-medium leading-snug text-ink">
                {outing.title}
              </h3>
            </div>
          </div>
          {outing.status === "cancelled" ? (
            <Tag>Cancelled</Tag>
          ) : outing.status === "full" ? (
            <Tag tone="gold">Full</Tag>
          ) : started ? (
            <Tag>Past</Tag>
          ) : outing.spotsLeft <= 1 ? (
            <Tag tone="gold">Last spot</Tag>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{outing.pitch}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-terracotta-500" aria-hidden />
            {formatSingapore(outing.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-terracotta-500" aria-hidden />
            {outing.venueName ?? (
              <>
                {outing.area} · <Lock className="h-3 w-3" aria-hidden /> venue after acceptance
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-terracotta-500" aria-hidden />
            {outing.spotsLeft} spot{outing.spotsLeft === 1 ? "" : "s"} left
          </span>
        </div>

        <div className="mt-3.5 flex items-center justify-between border-t border-sand-200/70 pt-3">
          {outing.host ? (
            <span className="flex items-center gap-2 text-xs text-ink-soft">
              <Avatar seed={outing.host.avatarSeed} name={outing.host.displayName} size="xs" />
              Hosted by <span className="font-semibold text-ink">{outing.host.displayName}</span>
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-1.5">
            {outing.preferences?.alcoholFree && <Tag tone="forest">Alcohol-free</Tag>}
            {outing.preferences && (
              <Tag>{BUDGET_LABELS[outing.preferences.budgetBand] ?? outing.preferences.budgetBand}</Tag>
            )}
          </div>
        </div>

        {outing.viewer.requestStatus === "pending" && (
          <p className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-xs font-medium text-ink-soft">
            Your request is with {outing.host?.displayName.split(" ")[0] ?? "the host"} — we'll let
            you know.
          </p>
        )}
        {outing.viewer.isMember && !outing.viewer.isHost && (
          <p className="mt-3 rounded-xl bg-forest-600/10 px-3 py-2 text-xs font-semibold text-forest-700">
            You're in — see venue & chat inside.
          </p>
        )}
        {outing.viewer.isHost && (
          <p className="mt-3 rounded-xl bg-terracotta-500/10 px-3 py-2 text-xs font-semibold text-terracotta-700">
            You're hosting this one.
          </p>
        )}
      </Link>
    </MotionCard>
  );
}
