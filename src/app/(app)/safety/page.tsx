"use client";

/**
 * Safety centre (PRD §10) — the community pledge, how reporting works,
 * and the people you've blocked (with quiet unblock).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, HeartHandshake, Flag, UserX } from "lucide-react";
import { api } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/utils";
import type { PublicProfile } from "@/lib/server/serializers";

const PLEDGE = [
  "I'm here for friendship — genuine, platonic connection.",
  "I'll treat every person with warmth and respect, online and in person.",
  "I'll honour boundaries the first time they're expressed.",
  "I'll show up when I say I will, or let people know early.",
  "I'll keep what people share with me in confidence.",
];

export default function SafetyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const blockedQuery = useQuery({
    queryKey: ["safety", "blocked"],
    queryFn: () =>
      api.get<{ blocked: { profile: PublicProfile; since: number }[] }>("/api/safety/block"),
  });

  const unblock = useMutation({
    mutationFn: (userId: string) =>
      api.post("/api/safety/block", { userId, blocked: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety", "blocked"] });
      queryClient.invalidateQueries({ queryKey: ["souldrop"] });
      toast("Unblocked. They're never told either way.", "info");
    },
    onError: () => toast("Couldn't unblock — please try again.", "error"),
  });

  const blocked = blockedQuery.data?.blocked ?? [];

  return (
    <div>
      <PageHeader
        back
        eyebrow="Looked after, always"
        title="Safety centre"
        subtitle="Friendship should feel safe from the very first hello."
      />

      <div className="space-y-8">
        {/* Pledge */}
        <section aria-label="Community pledge">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium text-ink">
            <HeartHandshake className="h-4 w-4 text-terracotta-600" aria-hidden />
            The community pledge
          </h2>
          <Card className="p-5">
            <ul className="space-y-3">
              {PLEDGE.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs italic text-ink-faint">
              Everyone here accepted this pledge when they joined. Romantic advances are
              a boundary violation on Soul Tribe — report them without hesitation.
            </p>
          </Card>
        </section>

        {/* How reporting works */}
        <section aria-label="How reporting works">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium text-ink">
            <Flag className="h-4 w-4 text-terracotta-600" aria-hidden />
            How reporting works
          </h2>
          <Card className="space-y-3 p-5 text-sm leading-relaxed text-ink-soft">
            <p>
              You can report any person, outing or message from the{" "}
              <span className="font-semibold text-ink">⋯ menu</span> on their page.
              Reports are confidential — the person is never told who raised a concern.
            </p>
            <p>
              Our team reviews every report. Depending on what we find, we may reach
              out to you, restrict an account, or remove someone from the community.
            </p>
            <p className="text-xs text-ink-faint">
              If you're ever in immediate danger at an outing, please contact local
              emergency services first — in Singapore, dial 999.
            </p>
          </Card>
        </section>

        {/* Blocked people */}
        <section aria-label="Blocked people">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium text-ink">
            <UserX className="h-4 w-4 text-terracotta-600" aria-hidden />
            People you've blocked
          </h2>
          {blockedQuery.isLoading ? (
            <CardSkeleton lines={2} />
          ) : blockedQuery.isError ? (
            <ErrorState onRetry={() => blockedQuery.refetch()} />
          ) : blocked.length === 0 ? (
            <Card className="p-5 text-sm text-ink-faint">
              Nobody. If you ever block someone, they disappear from your world
              instantly — and they're never notified.
            </Card>
          ) : (
            <ul className="space-y-2">
              {blocked.map(({ profile, since }) => (
                <li key={profile.userId}>
                  <Card className="flex items-center gap-3 p-4">
                    <Avatar seed={profile.avatarSeed} name={profile.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {profile.displayName}
                      </p>
                      <p className="text-xs text-ink-faint">Blocked {relativeTime(since)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={unblock.isPending && unblock.variables === profile.userId}
                      onClick={() => unblock.mutate(profile.userId)}
                    >
                      Unblock
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
