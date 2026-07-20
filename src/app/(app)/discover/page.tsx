"use client";

/**
 * Discover — curated browsing beyond the weekly drop (PRD §7).
 * Two lenses: People (fit-band / season filters) and Outings (category,
 * area, budget, comfort filters). Server enforces caps — no infinite feed.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Chip } from "@/components/ui/Chip";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PersonCard } from "@/components/cards/PersonCard";
import { OutingCard } from "@/components/cards/OutingCard";
import { FIT_BAND_LABELS, type FitBand } from "@/lib/matching/types";
import { CATEGORY_LABELS, LIFE_SEASON_LABELS, BUDGET_LABELS } from "@/lib/utils";
import { AREAS } from "@/lib/validation/schemas";
import type { PublicProfile, SerializedOuting } from "@/lib/server/serializers";
import type { MatchExplanation } from "@/lib/matching/types";

function PeopleLens() {
  const [band, setBand] = useState<FitBand | null>(null);
  const [season, setSeason] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (band) params.set("band", band);
  if (season) params.set("season", season);

  const query = useQuery({
    queryKey: ["discover", "people", band, season],
    queryFn: () =>
      api.get<{ people: { profile: PublicProfile; band: FitBand; explanation: MatchExplanation }[] }>(
        `/api/discover/people?${params.toString()}`
      ),
  });

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {(Object.keys(FIT_BAND_LABELS) as FitBand[]).map((b) => (
          <Chip key={b} selected={band === b} onClick={() => setBand(band === b ? null : b)}>
            {FIT_BAND_LABELS[b]}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(LIFE_SEASON_LABELS).map(([value, label]) => (
          <Chip
            key={value}
            tone="forest"
            selected={season === value}
            onClick={() => setSeason(season === value ? null : value)}
          >
            {label}
          </Chip>
        ))}
      </div>

      {query.isLoading ? (
        <ListSkeleton count={3} lines={2} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data!.people.length === 0 ? (
        <EmptyState
          emoji="🔭"
          title="No one matches those filters right now"
          body="Try widening a filter — or check back after Monday's Soul Drop brings new faces."
        />
      ) : (
        <div className="space-y-4">
          {query.data!.people.map((p, i) => (
            <PersonCard
              key={p.profile.userId}
              profile={p.profile}
              band={p.band}
              explanation={p.explanation}
              delay={i * 0.05}
            />
          ))}
          <p className="pt-2 text-center text-xs italic text-ink-faint">
            Curated on purpose — we'd rather show a few right people than an endless scroll.
          </p>
        </div>
      )}
    </div>
  );
}

function OutingsLens() {
  const [category, setCategory] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [alcoholFree, setAlcoholFree] = useState(false);
  const [accessible, setAccessible] = useState(false);

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (area) params.set("area", area);
  if (budget) params.set("budget", budget);
  if (alcoholFree) params.set("alcoholFree", "1");
  if (accessible) params.set("accessible", "1");

  const query = useQuery({
    queryKey: ["discover", "outings", category, area, budget, alcoholFree, accessible],
    queryFn: () =>
      api.get<{ outings: SerializedOuting[] }>(`/api/discover/outings?${params.toString()}`),
  });

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <Chip
            key={value}
            selected={category === value}
            onClick={() => setCategory(category === value ? null : value)}
          >
            {label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {AREAS.map((a) => (
          <Chip key={a} tone="forest" selected={area === a} onClick={() => setArea(area === a ? null : a)}>
            {a}
          </Chip>
        ))}
        {Object.entries(BUDGET_LABELS).map(([value, label]) => (
          <Chip
            key={value}
            tone="forest"
            selected={budget === value}
            onClick={() => setBudget(budget === value ? null : value)}
          >
            {label}
          </Chip>
        ))}
        <Chip tone="forest" selected={alcoholFree} onClick={() => setAlcoholFree((s) => !s)}>
          Alcohol-free
        </Chip>
        <Chip tone="forest" selected={accessible} onClick={() => setAccessible((s) => !s)}>
          Step-free
        </Chip>
      </div>

      {query.isLoading ? (
        <ListSkeleton count={3} lines={2} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data!.outings.length === 0 ? (
        <EmptyState
          emoji="🏮"
          title="Nothing here yet — be the spark"
          body="No upcoming outings match those filters. Pitch one yourself: small plans, warmly hosted, are how tribes begin."
          action={
            <Link href="/outings/new">
              <Button>Pitch an outing</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {query.data!.outings.map((o, i) => (
            <OutingCard key={o.id} outing={o} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "outings" ? "outings" : "people";
  const [tab, setTab] = useState<"people" | "outings">(initialTab);

  return (
    <div>
      <PageHeader
        eyebrow="Discover"
        title="Wander a little"
        subtitle="Compatible people and cozy outings around Singapore — curated, never endless."
      />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "people", label: "People" },
          { value: "outings", label: "Outings" },
        ]}
      />
      {tab === "people" ? <PeopleLens /> : <OutingsLens />}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<ListSkeleton count={3} />}>
      <DiscoverContent />
    </Suspense>
  );
}
