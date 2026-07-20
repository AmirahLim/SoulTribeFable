"use client";

/**
 * Person profile — the self-authored DNA portrait plus a live, explainable
 * compatibility read for the viewer (PRD §6/§8). Connection happens through
 * outings, so the primary action points at shared plans, not open DMs.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ShieldAlert, Ban, Languages, MapPin, Compass } from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { FitBandBadge } from "@/components/ui/FitBandBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { MatchInsight } from "@/components/MatchInsight";
import { ReportSheet } from "@/components/ReportSheet";
import { LIFE_SEASON_LABELS } from "@/lib/utils";
import type { PublicProfile } from "@/lib/server/serializers";
import type { FitBand, MatchExplanation } from "@/lib/matching/types";

interface PersonResponse {
  profile: PublicProfile;
  summaryHeadline: string | null;
  summarySections: { id: string; text: string }[];
  match: { band: FitBand; explanation: MatchExplanation } | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
  english: "English",
  mandarin: "Mandarin",
  malay: "Malay",
  tamil: "Tamil",
  cantonese: "Cantonese",
  other: "Other",
};

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["person", id],
    queryFn: () => api.get<PersonResponse>(`/api/people/${id}`),
    retry: false,
  });

  async function toggleSave() {
    const next = !saved;
    setSaved(next); // optimistic
    try {
      await api.post("/api/saved", { objectType: "person", objectId: id, saved: next });
      toast(next ? "Saved to your list." : "Removed from saved.", "success");
    } catch {
      setSaved(!next);
      toast("Couldn't update that — please try again.", "error");
    }
  }

  async function blockPerson() {
    setBusy(true);
    try {
      await api.post("/api/safety/block", { userId: id, blocked: true });
      toast("Done. You won't see each other on Soul Tribe.", "success");
      queryClient.invalidateQueries({ queryKey: ["souldrop"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      router.replace("/home");
    } catch (err) {
      toast(err instanceof ClientApiError ? err.message : "Couldn't block just now.", "error");
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-24 !rounded-full" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <EmptyState
        emoji="🌫️"
        title="Person not found"
        body="They may have stepped away from Soul Tribe, or the link is out of date."
        action={
          <Link href="/discover">
            <Button variant="secondary">Back to Discover</Button>
          </Link>
        }
      />
    );
  }

  const { profile, summaryHeadline, summarySections, match } = query.data;
  const firstName = profile.displayName.split(" ")[0];

  return (
    <div>
      <PageHeader back title="" eyebrow="Profile" />

      <div className="flex flex-col items-center text-center">
        <Avatar seed={profile.avatarSeed} name={profile.displayName} size="xl" />
        <h1 className="mt-4 font-display text-3xl font-medium text-ink">
          {profile.displayName}
          {profile.pronouns && (
            <span className="ml-2 align-middle text-sm font-normal text-ink-faint">
              {profile.pronouns}
            </span>
          )}
        </h1>
        {match && (
          <div className="mt-3">
            <FitBandBadge band={match.band} limitedEvidence={match.explanation.limitedEvidence} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {profile.lifeSeason && (
            <Tag>
              <Compass className="h-3 w-3" aria-hidden />
              {LIFE_SEASON_LABELS[profile.lifeSeason] ?? profile.lifeSeason}
            </Tag>
          )}
          {profile.neighborhood && (
            <Tag>
              <MapPin className="h-3 w-3" aria-hidden />
              {profile.neighborhood}
            </Tag>
          )}
          {profile.languages.length > 0 && (
            <Tag>
              <Languages className="h-3 w-3" aria-hidden />
              {profile.languages.map((l) => LANGUAGE_LABELS[l] ?? l).join(", ")}
            </Tag>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mx-auto mt-6 max-w-md text-center text-[15px] leading-relaxed text-ink">
          {profile.bio}
        </p>
      )}
      {profile.friendshipFeelsLike && (
        <p className="mx-auto mt-3 max-w-md text-center font-display text-[15px] italic leading-relaxed text-terracotta-700">
          “A good friendship with me feels like {profile.friendshipFeelsLike.replace(/^[…\s.]+/, "")}”
        </p>
      )}

      {/* Compatibility insight */}
      {match && (
        <Card className="mt-8 p-5">
          <h2 className="mb-4 font-display text-lg font-medium text-ink">
            You &amp; {firstName}
          </h2>
          <MatchInsight explanation={match.explanation} />
        </Card>
      )}

      {/* Their DNA portrait */}
      {(summaryHeadline || summarySections.length > 0) && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 font-display text-lg font-medium text-ink">
            {firstName}'s Friendship DNA
          </h2>
          {summaryHeadline && (
            <p className="mb-3 font-display text-[15px] italic text-terracotta-700">
              “{summaryHeadline}”
            </p>
          )}
          <div className="space-y-3">
            {summarySections.map((s) => (
              <p key={s.id} className="text-sm leading-relaxed text-ink">
                {s.text}
              </p>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Written with {firstName} — they chose what to share here.
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        <Link href="/discover?tab=outings" className="w-full">
          <Button full size="lg">
            Find an outing to share
          </Button>
        </Link>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          On Soul Tribe, friendships begin around real plans — chat opens once you're in an
          outing together.
        </p>
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Bookmark className="h-4 w-4" />}
            onClick={toggleSave}
          >
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ShieldAlert className="h-4 w-4" />}
            onClick={() => setReportOpen(true)}
          >
            Report
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Ban className="h-4 w-4" />}
            onClick={() => setBlockOpen(true)}
          >
            Block
          </Button>
        </div>
      </div>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        subjectType="user"
        subjectId={id}
        subjectName={firstName}
      />

      <Sheet open={blockOpen} onClose={() => setBlockOpen(false)} title={`Block ${firstName}?`}>
        <p className="text-sm leading-relaxed text-ink-soft">
          You won't appear in each other's matches, outings or chats. {firstName} won't be
          told — it just quietly takes effect.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setBlockOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={blockPerson}>
            Block {firstName}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
