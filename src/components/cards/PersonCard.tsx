"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { MotionCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Chip";
import { FitBandBadge } from "@/components/ui/FitBandBadge";
import { LIFE_SEASON_LABELS } from "@/lib/utils";
import type { PublicProfile } from "@/lib/server/serializers";
import type { MatchExplanation, FitBand } from "@/lib/matching/types";

/** Compatible-person card used in Soul Drop and Discover. */
export function PersonCard({
  profile,
  band,
  explanation,
  delay = 0,
  footer,
}: {
  profile: PublicProfile;
  band: FitBand;
  explanation: MatchExplanation | null;
  delay?: number;
  footer?: ReactNode;
}) {
  return (
    <MotionCard delay={delay} className="overflow-hidden">
      <Link href={`/people/${profile.userId}`} className="block p-5 transition-colors hover:bg-sand-50/60">
        <div className="flex items-start gap-4">
          <Avatar seed={profile.avatarSeed} name={profile.displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-display text-lg font-medium text-ink">{profile.displayName}</h3>
              {profile.pronouns && (
                <span className="text-xs text-ink-faint">{profile.pronouns}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <FitBandBadge band={band} limitedEvidence={explanation?.limitedEvidence} />
              {profile.lifeSeason && (
                <Tag>{LIFE_SEASON_LABELS[profile.lifeSeason] ?? profile.lifeSeason}</Tag>
              )}
            </div>
          </div>
        </div>

        {explanation?.headline && (
          <p className="mt-4 font-display text-[15px] italic leading-relaxed text-terracotta-700">
            “{explanation.headline}”
          </p>
        )}
        {profile.friendshipFeelsLike && (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Friendship with {profile.displayName.split(" ")[0]} feels like{" "}
            {profile.friendshipFeelsLike.replace(/^[…\s.]+/, "").trim()}
          </p>
        )}
      </Link>
      {footer && <div className="border-t border-sand-200/70 px-5 py-3">{footer}</div>}
    </MotionCard>
  );
}
