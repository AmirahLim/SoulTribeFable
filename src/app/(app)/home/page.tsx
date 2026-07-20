"use client";

/**
 * Home — the weekly Soul Drop (PRD §5/§7).
 * A small, curated set of people and a few outing suggestions. Deliberately
 * finite: when you've seen this week's drop, that's the drop.
 */

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, X, MessageCircleHeart, ArrowRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PersonCard } from "@/components/cards/PersonCard";
import { OutingCard } from "@/components/cards/OutingCard";
import type { PublicProfile, SerializedOuting } from "@/lib/server/serializers";
import type { MatchExplanation, FitBand } from "@/lib/matching/types";

interface DropPerson {
  recommendationId: string;
  profile: PublicProfile;
  band: FitBand;
  explanation: MatchExplanation | null;
  status: string;
}

interface SoulDropResponse {
  people: DropPerson[];
  outings: SerializedOuting[];
  weekKey: string | null;
}

interface PendingReflection {
  outing: { id: string; title: string; startsAt: number };
  companions: { userId: string; displayName: string }[];
}

export default function HomePage() {
  const { viewer } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dropQuery = useQuery({
    queryKey: ["souldrop"],
    queryFn: () => api.get<SoulDropResponse>("/api/souldrop"),
  });

  const reflectionsQuery = useQuery({
    queryKey: ["reflections", "pending"],
    queryFn: () => api.get<{ pending: PendingReflection[] }>("/api/reflections/pending"),
  });

  // Optimistic save/dismiss on recommendations.
  const updateRec = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "saved" | "dismissed" }) =>
      api.patch(`/api/recommendations/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["souldrop"] });
      const prev = queryClient.getQueryData<SoulDropResponse>(["souldrop"]);
      queryClient.setQueryData<SoulDropResponse>(["souldrop"], (old) =>
        old
          ? {
              ...old,
              people:
                status === "dismissed"
                  ? old.people.filter((p) => p.recommendationId !== id)
                  : old.people.map((p) =>
                      p.recommendationId === id ? { ...p, status } : p
                    ),
            }
          : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["souldrop"], ctx.prev);
      toast("Couldn't update that — please try again.", "error");
    },
    onSuccess: (_data, { status }) => {
      if (status === "saved") toast("Saved for later.", "success");
    },
  });

  const firstName = viewer?.profile.displayName.split(" ")[0] ?? "friend";
  const pending = reflectionsQuery.data?.pending ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Your weekly Soul Drop"
        title={`Hello, ${firstName}`}
        subtitle="A few people we believe you could genuinely click with — chosen slowly, refreshed weekly."
      />

      {/* Reflection nudge */}
      {pending.length > 0 && (
        <Link
          href={`/outings/${pending[0].outing.id}/reflect`}
          className="mb-6 flex items-center gap-3 rounded-card border border-gold-400/40 bg-gold-400/10 p-4 transition-transform hover:scale-[1.01]"
        >
          <span className="organic-blob flex h-10 w-10 shrink-0 items-center justify-center bg-gold-400/25">
            <MessageCircleHeart className="h-5 w-5 text-terracotta-700" aria-hidden />
          </span>
          <span className="flex-1 text-sm">
            <span className="font-semibold text-ink">How was “{pending[0].outing.title}”?</span>
            <span className="block text-xs text-ink-soft">
              A 30-second private reflection helps us match you better.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-terracotta-600" aria-hidden />
        </Link>
      )}

      {dropQuery.isLoading ? (
        <ListSkeleton count={3} lines={3} />
      ) : dropQuery.isError ? (
        <ErrorState onRetry={() => dropQuery.refetch()} />
      ) : (
        <>
          <section aria-label="People in your Soul Drop" className="space-y-4">
            {dropQuery.data!.people.length === 0 ? (
              <EmptyState
                emoji="🌱"
                title="Your next drop is growing"
                body="We introduce a handful of people at a time, chosen with care. Meanwhile, outings are a lovely low-pressure way to meet kindred folks."
                action={
                  <Link href="/discover?tab=outings">
                    <Button variant="secondary">Browse outings</Button>
                  </Link>
                }
              />
            ) : (
              dropQuery.data!.people.map((p, i) => (
                <PersonCard
                  key={p.recommendationId}
                  profile={p.profile}
                  band={p.band}
                  explanation={p.explanation}
                  delay={i * 0.07}
                  footer={
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-faint">
                        {p.status === "saved" ? "Saved to your list" : "This week's introduction"}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<X className="h-4 w-4" />}
                          onClick={() =>
                            updateRec.mutate({ id: p.recommendationId, status: "dismissed" })
                          }
                        >
                          Not now
                        </Button>
                        <Button
                          variant={p.status === "saved" ? "forest" : "secondary"}
                          size="sm"
                          icon={<Bookmark className="h-4 w-4" />}
                          onClick={() =>
                            updateRec.mutate({ id: p.recommendationId, status: "saved" })
                          }
                        >
                          {p.status === "saved" ? "Saved" : "Save"}
                        </Button>
                      </div>
                    </div>
                  }
                />
              ))
            )}
          </section>

          {dropQuery.data!.people.length > 0 && (
            <p className="mt-6 text-center text-xs italic leading-relaxed text-ink-faint">
              That's this week's drop — quality over quantity, always. New introductions arrive
              every Monday.
            </p>
          )}

          {/* Outing suggestions */}
          {dropQuery.data!.outings.length > 0 && (
            <section aria-label="Outings picked for you" className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-xl font-medium text-ink">Outings picked for you</h2>
                <Link
                  href="/discover?tab=outings"
                  className="text-sm font-semibold text-terracotta-600 hover:underline"
                >
                  See all
                </Link>
              </div>
              <div className="space-y-4">
                {dropQuery.data!.outings.map((o, i) => (
                  <OutingCard key={o.id} outing={o} delay={0.1 + i * 0.07} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
