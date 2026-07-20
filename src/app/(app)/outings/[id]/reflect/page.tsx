"use client";

/**
 * Post-outing reflection (PRD §9). Entirely private: nothing here is ever
 * shown to other members — it only tunes future matching, gently.
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Lock, HeartHandshake } from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScaleField, Textarea } from "@/components/ui/fields";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { formatSingapore } from "@/lib/utils";
import type { PublicProfile, SerializedOuting } from "@/lib/server/serializers";

const INTENT_OPTIONS = [
  { value: "would_meet_again", label: "I'd happily meet again", hint: "We'll look for chances to reconnect you." },
  { value: "maybe", label: "Maybe — no strong pull", hint: "Totally fine. Not every outing is a spark." },
  { value: "not_a_fit", label: "Not a fit for me", hint: "We'll quietly adjust. Nobody is told." },
] as const;

export default function ReflectPage() {
  const params = useParams<{ id: string }>();
  const outingId = params.id;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const outingQuery = useQuery({
    queryKey: ["outing", outingId],
    queryFn: () => api.get<{ outing: SerializedOuting }>(`/api/outings/${outingId}`),
  });

  const pendingQuery = useQuery({
    queryKey: ["reflections", "pending"],
    queryFn: () =>
      api.get<{ pending: { outing: SerializedOuting; companions: PublicProfile[] }[] }>(
        "/api/reflections/pending"
      ),
  });

  const companions = useMemo(
    () =>
      pendingQuery.data?.pending.find((p) => p.outing.id === outingId)?.companions ?? [],
    [pendingQuery.data, outingId]
  );

  const [attended, setAttended] = useState<boolean | null>(null);
  const [comfort, setComfort] = useState<number | null>(null);
  const [connection, setConnection] = useState<number | null>(null);
  const [futureIntent, setFutureIntent] = useState<string | null>(null);
  const [privateText, setPrivateText] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/api/outings/${outingId}/reflection`, {
        attended: attended === true,
        comfort: comfort ?? 3,
        connection: connection ?? 3,
        futureIntent: futureIntent ?? "maybe",
        privateText: privateText.trim(),
        subjectIds,
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["reflections", "pending"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError && err.status === 409
          ? err.message
          : "Couldn't save your reflection — please try again.";
      toast(msg, "error");
    },
  });

  const outing = outingQuery.data?.outing;
  const ready =
    attended !== null &&
    (attended === false || (comfort !== null && connection !== null && futureIntent !== null));

  const toggleSubject = (id: string) =>
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  if (outingQuery.isLoading) {
    return <CardSkeleton lines={4} />;
  }
  if (outingQuery.isError || !outing) {
    return <ErrorState onRetry={() => outingQuery.refetch()} />;
  }

  if (done) {
    return (
      <EmptyState
        emoji="🌿"
        title="Thank you for reflecting"
        body="Your words stay private and help us introduce you to people who feel right. That's the whole loop."
        action={<Button onClick={() => router.push("/home")}>Back to your Soul Drop</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        back
        eyebrow="A private reflection"
        title={`How was “${outing.title}”?`}
        subtitle={formatSingapore(outing.startsAt)}
      />

      <p className="mb-6 flex items-start gap-2 rounded-card border border-sand-200 bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" aria-hidden />
        Only you and our matching engine see this. No public ratings, no scores on
        anyone's profile — ever.
      </p>

      <div className="space-y-6">
        {/* Attended */}
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-ink">Did you make it?</p>
          <div className="flex gap-2">
            <Chip selected={attended === true} onClick={() => setAttended(true)}>
              Yes, I went
            </Chip>
            <Chip selected={attended === false} onClick={() => setAttended(false)}>
              I couldn't make it
            </Chip>
          </div>
          {attended === false && (
            <p className="mt-3 text-xs italic leading-relaxed text-ink-faint">
              No judgement — life happens. Letting us know keeps things fair for hosts.
            </p>
          )}
        </Card>

        {attended && (
          <>
            <Card className="space-y-5 p-5">
              <ScaleField
                label="How at ease did you feel?"
                low="A bit tense"
                high="Fully myself"
                value={comfort}
                onChange={setComfort}
              />
              <ScaleField
                label="Did the conversation flow?"
                low="Hard work"
                high="Lost track of time"
                value={connection}
                onChange={setConnection}
              />
            </Card>

            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold text-ink">Looking ahead…</p>
              <div className="space-y-2" role="radiogroup" aria-label="Future intent">
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={futureIntent === opt.value}
                    onClick={() => setFutureIntent(opt.value)}
                    className={clsx(
                      "w-full rounded-card border p-3.5 text-left transition-colors",
                      futureIntent === opt.value
                        ? "border-terracotta-500 bg-terracotta-300/10"
                        : "border-sand-200 bg-surface-raised hover:border-sand-300"
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{opt.hint}</span>
                  </button>
                ))}
              </div>

              {companions.length > 0 && futureIntent === "would_meet_again" && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <HeartHandshake className="h-3.5 w-3.5 text-terracotta-600" aria-hidden />
                    Anyone in particular? (optional, private)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companions.map((c) => (
                      <Chip
                        key={c.userId}
                        selected={subjectIds.includes(c.userId)}
                        onClick={() => toggleSubject(c.userId)}
                        tone="forest"
                      >
                        <span className="flex items-center gap-1.5">
                          <Avatar seed={c.avatarSeed} name={c.displayName} size="xs" />
                          {c.displayName.split(" ")[0]}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <Textarea
                label="Anything you want to remember? (optional)"
                hint="A private note to yourself — and a quiet signal to us."
                value={privateText}
                onChange={(e) => setPrivateText(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="e.g. Loved the slow pace. Would pick a quieter café next time…"
              />
              <p className="mt-1 text-right text-[11px] text-ink-faint">
                {privateText.length}/1000
              </p>
            </Card>
          </>
        )}

        <Button
          full
          size="lg"
          disabled={!ready}
          loading={submit.isPending}
          onClick={() => submit.mutate()}
        >
          Save my reflection
        </Button>
      </div>
    </div>
  );
}
