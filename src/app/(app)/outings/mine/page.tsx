"use client";

/**
 * My outings — the host dashboard & personal outing overview (PRD §8/§9).
 * Three lenses: outings you host (with pending-request counts), outings
 * you've joined, and your own join requests (with withdraw).
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Clock3, Undo2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { OutingCard } from "@/components/cards/OutingCard";
import { formatSingapore, relativeTime } from "@/lib/utils";
import type { SerializedOuting } from "@/lib/server/serializers";

type TabValue = "hosting" | "joined" | "requests";

interface MineResponse {
  hosting: { outing: SerializedOuting; pendingRequests: number }[];
  joined: SerializedOuting[];
  requests: {
    id: string;
    status: string;
    note: string;
    createdAt: number;
    outing: SerializedOuting;
  }[];
}

const REQUEST_STATUS_COPY: Record<string, { label: string; tone: "sand" | "forest" | "gold" }> = {
  pending: { label: "Waiting for the host", tone: "gold" },
  accepted: { label: "You're in", tone: "forest" },
  declined: { label: "Not this time", tone: "sand" },
  withdrawn: { label: "Withdrawn", tone: "sand" },
  expired: { label: "Closed", tone: "sand" },
};

function MyOutingsInner() {
  const searchParams = useSearchParams();
  const initialTab = (["hosting", "joined", "requests"] as const).includes(
    searchParams.get("tab") as TabValue
  )
    ? (searchParams.get("tab") as TabValue)
    : "hosting";
  const [tab, setTab] = useState<TabValue>(initialTab);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mineQuery = useQuery({
    queryKey: ["outings", "mine"],
    queryFn: () => api.get<MineResponse>("/api/outings/mine"),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => api.patch(`/api/requests/${id}`, { decision: "withdraw" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings", "mine"] });
      toast("Request withdrawn — no hard feelings.", "info");
    },
    onError: () => toast("Couldn't withdraw that request — please try again.", "error"),
  });

  const data = mineQuery.data;
  const pendingTotal = data?.hosting.reduce((sum, h) => sum + h.pendingRequests, 0) ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Your gatherings"
        title="My outings"
        subtitle="Everything you're hosting, joining, or waiting to hear back on."
        action={
          <Link href="/outings/new">
            <Button size="sm">Pitch an outing</Button>
          </Link>
        }
      />

      <Tabs<TabValue>
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "hosting", label: "Hosting", count: pendingTotal },
          { value: "joined", label: "Joined" },
          { value: "requests", label: "Requests" },
        ]}
      />

      {mineQuery.isLoading ? (
        <ListSkeleton count={3} lines={3} />
      ) : mineQuery.isError ? (
        <ErrorState onRetry={() => mineQuery.refetch()} />
      ) : tab === "hosting" ? (
        <section aria-label="Outings you host" className="space-y-4">
          {data!.hosting.length === 0 ? (
            <EmptyState
              emoji="🕯️"
              title="You haven't hosted yet"
              body="Hosting is just inviting people into something you'd enjoy anyway. Small, simple outings work beautifully."
              action={
                <Link href="/outings/new">
                  <Button>Pitch your first outing</Button>
                </Link>
              }
            />
          ) : (
            data!.hosting.map(({ outing, pendingRequests }, i) => (
              <div key={outing.id} className="relative">
                <OutingCard outing={outing} delay={i * 0.06} />
                {pendingRequests > 0 && outing.status === "published" && (
                  <Link
                    href={`/outings/${outing.id}`}
                    className="mt-2 flex items-center gap-2 rounded-card border border-gold-400/40 bg-gold-400/10 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-400/20"
                  >
                    <Inbox className="h-4 w-4 text-terracotta-600" aria-hidden />
                    {pendingRequests === 1
                      ? "1 person is waiting to hear from you"
                      : `${pendingRequests} people are waiting to hear from you`}
                  </Link>
                )}
              </div>
            ))
          )}
        </section>
      ) : tab === "joined" ? (
        <section aria-label="Outings you've joined" className="space-y-4">
          {data!.joined.length === 0 ? (
            <EmptyState
              emoji="🧺"
              title="Nothing on the calendar yet"
              body="When a host welcomes you into an outing, it will appear here with the full venue details."
              action={
                <Link href="/discover?tab=outings">
                  <Button variant="secondary">Browse outings</Button>
                </Link>
              }
            />
          ) : (
            data!.joined.map((o, i) => <OutingCard key={o.id} outing={o} delay={i * 0.06} />)
          )}
        </section>
      ) : (
        <section aria-label="Your join requests" className="space-y-4">
          {data!.requests.length === 0 ? (
            <EmptyState
              emoji="✉️"
              title="No requests right now"
              body="When you ask to join an outing, you can keep an eye on it here while the host takes a look."
              action={
                <Link href="/discover?tab=outings">
                  <Button variant="secondary">Find an outing</Button>
                </Link>
              }
            />
          ) : (
            data!.requests.map((r) => {
              const statusCopy = REQUEST_STATUS_COPY[r.status] ?? {
                label: r.status,
                tone: "sand" as const,
              };
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/outings/${r.outing.id}`}
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <p className="truncate font-display text-base font-medium text-ink">
                        {r.outing.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden />
                        {formatSingapore(r.outing.startsAt)}
                      </p>
                    </Link>
                    <Tag tone={statusCopy.tone}>{statusCopy.label}</Tag>
                  </div>

                  <p className="mt-3 rounded-card bg-surface-sunken px-3 py-2 text-sm italic leading-relaxed text-ink-soft">
                    “{r.note}”
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-ink-faint">
                      Sent {relativeTime(r.createdAt)}
                    </span>
                    {r.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Undo2 className="h-4 w-4" />}
                        loading={withdraw.isPending && withdraw.variables === r.id}
                        onClick={() => withdraw.mutate(r.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}

          {data!.requests.some((r) => r.status === "declined") && (
            <p className="text-center text-xs italic leading-relaxed text-ink-faint">
              A “not this time” is about fit for one particular gathering — never about you.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default function MyOutingsPage() {
  return (
    <Suspense fallback={<ListSkeleton count={3} lines={3} />}>
      <MyOutingsInner />
    </Suspense>
  );
}
