"use client";

/**
 * Outing detail (PRD §9/§10).
 *  - Everyone: pitch, time, area, vibe tags; venue only after acceptance.
 *  - Guests: request-to-join with a note (or instant join for open outings),
 *    withdraw request / leave outing.
 *  - Hosts: review requests with fit explanations, accept/decline, remove
 *    members kindly, edit copy, cancel with automatic care messaging.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Lock,
  MessageCircle,
  ShieldAlert,
  PencilLine,
  XCircle,
  Check,
  X,
} from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Textarea, Input } from "@/components/ui/fields";
import { MatchInsight } from "@/components/MatchInsight";
import { ReportSheet } from "@/components/ReportSheet";
import { FitBandBadge } from "@/components/ui/FitBandBadge";
import { CATEGORY_EMOJI, CATEGORY_LABELS, BUDGET_LABELS, formatSingapore } from "@/lib/utils";
import type { PublicProfile, SerializedOuting } from "@/lib/server/serializers";
import type { MatchExplanation } from "@/lib/matching/types";

interface JoinRequestItem {
  id: string;
  status: string;
  note: string;
  createdAt: number;
  profile: PublicProfile;
  fit: MatchExplanation | null;
}

interface ChatListItem {
  id: string;
  outing: { id: string };
}

export default function OutingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { viewer } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [joinOpen, setJoinOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPitch, setEditPitch] = useState("");
  const [expandedFit, setExpandedFit] = useState<string | null>(null);

  const outingQuery = useQuery({
    queryKey: ["outing", id],
    queryFn: () => api.get<{ outing: SerializedOuting }>(`/api/outings/${id}`),
    retry: false,
  });

  const outing = outingQuery.data?.outing;
  const isHost = outing?.viewer.isHost ?? false;
  const isMember = outing?.viewer.isMember ?? false;

  const requestsQuery = useQuery({
    queryKey: ["outing", id, "requests"],
    queryFn: () => api.get<{ requests: JoinRequestItem[] }>(`/api/outings/${id}/requests`),
    enabled: isHost,
  });

  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: () => api.get<{ chats: ChatListItem[] }>("/api/chats"),
    enabled: isMember,
  });
  const chatId = useMemo(
    () => chatsQuery.data?.chats.find((c) => c.outing.id === id)?.id ?? null,
    [chatsQuery.data, id]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["outing", id] });
    queryClient.invalidateQueries({ queryKey: ["outings", "mine"] });
    queryClient.invalidateQueries({ queryKey: ["discover", "outings"] });
  };

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/api/outings/${id}/requests`, { note: note.trim() }),
    onSuccess: () => {
      setJoinOpen(false);
      setNote("");
      invalidate();
      toast(
        outing?.approvalMode === "open"
          ? "You're in! The venue and chat are now open to you."
          : "Request sent. We'll let you know as soon as the host replies.",
        "success"
      );
    },
    onError: (err) =>
      setNoteError(
        err instanceof ClientApiError ? err.message : "Couldn't send that — please try again."
      ),
  });

  const decideMutation = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: "accept" | "decline" }) =>
      api.patch(`/api/requests/${requestId}`, { decision }),
    onSuccess: (_d, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ["outing", id, "requests"] });
      invalidate();
      toast(decision === "accept" ? "Welcomed in — they can now see the venue." : "Declined gently — they'll get warm, neutral wording.", "success");
    },
    onError: (err) =>
      toast(err instanceof ClientApiError ? err.message : "Couldn't do that — try again.", "error"),
  });

  const withdrawRequestMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.patch(`/api/requests/${requestId}`, { decision: "withdraw" }),
    onSuccess: () => {
      invalidate();
      toast("Request withdrawn — no hard feelings, ever.", "success");
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: (body: { action: "withdraw" | "remove"; userId?: string }) =>
      api.post(`/api/outings/${id}/attendance`, body),
    onSuccess: (_d, vars) => {
      invalidate();
      toast(
        vars.action === "withdraw"
          ? "You've stepped out of this one. The host has been told kindly."
          : "Removed. They received a kind note, not a rejection.",
        "success"
      );
    },
    onError: (err) =>
      toast(err instanceof ClientApiError ? err.message : "Couldn't do that — try again.", "error"),
  });

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/api/outings/${id}`, body),
    onSuccess: () => {
      setCancelOpen(false);
      setEditOpen(false);
      invalidate();
    },
    onError: (err) =>
      toast(err instanceof ClientApiError ? err.message : "Couldn't do that — try again.", "error"),
  });

  if (outingQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (outingQuery.isError || !outing) {
    return (
      <EmptyState
        emoji="🌫️"
        title="Outing not found"
        body="It may have been taken down, or the link is out of date."
        action={
          <Link href="/discover?tab=outings">
            <Button variant="secondary">Browse outings</Button>
          </Link>
        }
      />
    );
  }

  const started = outing.startsAt <= Date.now();
  const deadlinePassed = outing.requestDeadline <= Date.now();
  const cancelled = outing.status === "cancelled";
  const canRequest =
    !isMember &&
    !cancelled &&
    !started &&
    !deadlinePassed &&
    outing.status === "published" &&
    outing.viewer.requestStatus !== "pending";
  const requests = requestsQuery.data?.requests ?? [];
  const pendingRequests = requests.filter((r) => r.status === "pending");

  function openJoin() {
    setNoteError(null);
    setJoinOpen(true);
  }

  function sendJoin() {
    if (note.trim().length < 10) {
      setNoteError("A sentence or two helps the host say yes (10+ characters).");
      return;
    }
    joinMutation.mutate();
  }

  return (
    <div>
      <PageHeader back title="" eyebrow={CATEGORY_LABELS[outing.category] ?? "Outing"} />

      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="organic-blob flex h-14 w-14 shrink-0 items-center justify-center bg-sand-100 text-2xl"
        >
          {CATEGORY_EMOJI[outing.category] ?? "🌿"}
        </span>
        <div>
          <h1 className="font-display text-2xl font-medium leading-snug text-ink sm:text-3xl">
            {outing.title}
          </h1>
          {cancelled && <Tag className="mt-2">Cancelled — everyone has been notified</Tag>}
          {!cancelled && outing.status === "full" && <Tag tone="gold" className="mt-2">Full</Tag>}
          {!cancelled && started && <Tag className="mt-2">This outing has happened</Tag>}
        </div>
      </div>

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink">{outing.pitch}</p>

      {/* Logistics */}
      <Card className="mt-6 space-y-3 p-5">
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <CalendarDays className="h-4 w-4 shrink-0 text-terracotta-500" aria-hidden />
          {formatSingapore(outing.startsAt)}
        </p>
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <Clock className="h-4 w-4 shrink-0 text-terracotta-500" aria-hidden />
          About {outing.durationMins >= 60 ? `${outing.durationMins / 60} hour${outing.durationMins > 60 ? "s" : ""}` : `${outing.durationMins} mins`}
          {!deadlinePassed && !started && (
            <span className="text-ink-faint">
              · requests close {formatSingapore(outing.requestDeadline)}
            </span>
          )}
        </p>
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <MapPin className="h-4 w-4 shrink-0 text-terracotta-500" aria-hidden />
          {outing.venueName ? (
            <span>
              <span className="font-semibold">{outing.venueName}</span>
              {outing.venueAddress && <span className="text-ink-soft"> · {outing.venueAddress}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              {outing.area}
              <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                <Lock className="h-3 w-3" aria-hidden /> exact venue shared after acceptance
              </span>
            </span>
          )}
        </p>
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <Users className="h-4 w-4 shrink-0 text-terracotta-500" aria-hidden />
          {outing.memberCount} going · {outing.spotsLeft} spot{outing.spotsLeft === 1 ? "" : "s"} left
        </p>
        <div className="flex flex-wrap gap-1.5 border-t border-sand-200/70 pt-3">
          {outing.preferences && (
            <>
              <Tag>{BUDGET_LABELS[outing.preferences.budgetBand]}</Tag>
              <Tag>
                {outing.preferences.energyLevel === "calm"
                  ? "Calm & cozy"
                  : outing.preferences.energyLevel === "lively"
                    ? "Lively"
                    : "Balanced energy"}
              </Tag>
              <Tag>
                {outing.preferences.conversationDepth === "deep"
                  ? "Deep conversation"
                  : outing.preferences.conversationDepth === "light"
                    ? "Light & fun"
                    : "Conversation drifts naturally"}
              </Tag>
              {outing.preferences.alcoholFree && <Tag tone="forest">Alcohol-free</Tag>}
              {outing.preferences.wheelchairAccessible && <Tag tone="forest">Step-free</Tag>}
              {outing.preferences.firstTimerFriendly && <Tag tone="gold">First-timer friendly</Tag>}
            </>
          )}
        </div>
      </Card>

      {/* Host */}
      {outing.host && (
        <Link
          href={`/people/${outing.host.userId}`}
          className="mt-4 flex items-center gap-3 rounded-card border border-sand-200/80 bg-surface-raised p-4 shadow-soft transition-colors hover:bg-sand-50/60"
        >
          <Avatar seed={outing.host.avatarSeed} name={outing.host.displayName} size="md" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Hosted by {outing.host.displayName}</p>
            {outing.host.friendshipFeelsLike && (
              <p className="line-clamp-1 text-xs italic text-ink-soft">
                “…{outing.host.friendshipFeelsLike.replace(/^[…\s.]+/, "")}”
              </p>
            )}
          </div>
        </Link>
      )}

      {/* Viewer actions */}
      {!cancelled && !started && (
        <div className="mt-6 space-y-3">
          {canRequest && (
            <Button full size="lg" onClick={openJoin} disabled={outing.status === "full"}>
              {outing.status === "full"
                ? "This one's full"
                : outing.approvalMode === "open"
                  ? "Join this outing"
                  : "Ask to join"}
            </Button>
          )}
          {outing.viewer.requestStatus === "pending" && (
            <div className="rounded-card border border-sand-200 bg-sand-100/60 p-4 text-center">
              <p className="text-sm font-medium text-ink">
                Your request is with {outing.host?.displayName.split(" ")[0] ?? "the host"}.
              </p>
              <button
                onClick={() => {
                  /* find my pending request id via mine endpoint is heavier; the API allows withdraw by request id — use outings/mine */
                  router.push("/outings/mine?tab=requests");
                }}
                className="mt-1 text-xs font-semibold text-terracotta-600 hover:underline"
              >
                Manage my requests
              </button>
            </div>
          )}
          {deadlinePassed && !isMember && outing.viewer.requestStatus !== "pending" && (
            <p className="text-center text-sm text-ink-soft">
              Requests for this outing have closed — but there's always the next one.
            </p>
          )}
          {isMember && !isHost && (
            <>
              {chatId && (
                <Link href={`/chats/${chatId}`} className="block">
                  <Button full size="lg" variant="forest" icon={<MessageCircle className="h-4 w-4" />}>
                    Open the outing chat
                  </Button>
                </Link>
              )}
              <Button
                full
                variant="ghost"
                onClick={() => attendanceMutation.mutate({ action: "withdraw" })}
                loading={attendanceMutation.isPending}
              >
                I can't make it anymore
              </Button>
            </>
          )}
        </div>
      )}

      {/* Member chat shortcut for hosts */}
      {isHost && !cancelled && chatId && (
        <Link href={`/chats/${chatId}`} className="mt-6 block">
          <Button full size="lg" variant="forest" icon={<MessageCircle className="h-4 w-4" />}>
            Open the outing chat
          </Button>
        </Link>
      )}

      {/* Host: request inbox */}
      {isHost && !cancelled && (
        <section className="mt-8" aria-label="Join requests">
          <h2 className="mb-3 font-display text-xl font-medium text-ink">
            Requests{pendingRequests.length > 0 && ` · ${pendingRequests.length} waiting`}
          </h2>
          {requestsQuery.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : requests.length === 0 ? (
            <p className="rounded-card border border-sand-200 bg-sand-100/50 p-4 text-sm text-ink-soft">
              No requests yet. We're quietly showing this outing to compatible people nearby.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Link href={`/people/${r.profile.userId}`}>
                      <Avatar seed={r.profile.avatarSeed} name={r.profile.displayName} size="md" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/people/${r.profile.userId}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {r.profile.displayName}
                        </Link>
                        {r.fit && <FitBandBadge band={r.fit.band} limitedEvidence={r.fit.limitedEvidence} />}
                        {r.status !== "pending" && (
                          <Tag>{r.status === "accepted" ? "Accepted" : r.status === "declined" ? "Declined" : r.status}</Tag>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">“{r.note}”</p>
                      {r.fit && (
                        <button
                          onClick={() => setExpandedFit(expandedFit === r.id ? null : r.id)}
                          className="mt-2 text-xs font-semibold text-terracotta-600 hover:underline"
                          aria-expanded={expandedFit === r.id}
                        >
                          {expandedFit === r.id ? "Hide fit details" : "Why they might fit"}
                        </button>
                      )}
                      {expandedFit === r.id && r.fit && (
                        <div className="mt-3 rounded-xl bg-sand-50 p-3.5">
                          <MatchInsight explanation={r.fit} />
                        </div>
                      )}
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 flex justify-end gap-2 border-t border-sand-200/70 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X className="h-4 w-4" />}
                        onClick={() => decideMutation.mutate({ requestId: r.id, decision: "decline" })}
                        loading={decideMutation.isPending}
                      >
                        Not this time
                      </Button>
                      <Button
                        variant="forest"
                        size="sm"
                        icon={<Check className="h-4 w-4" />}
                        onClick={() => decideMutation.mutate({ requestId: r.id, decision: "accept" })}
                        loading={decideMutation.isPending}
                        disabled={outing.spotsLeft === 0}
                      >
                        Welcome in
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Host management */}
      {isHost && !cancelled && !started && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<PencilLine className="h-4 w-4" />}
            onClick={() => {
              setEditTitle(outing.title);
              setEditPitch(outing.pitch);
              setEditOpen(true);
            }}
          >
            Edit wording
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle className="h-4 w-4" />}
            onClick={() => setCancelOpen(true)}
          >
            Cancel outing
          </Button>
        </div>
      )}

      {/* Reflect + report */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {started && isMember && !cancelled && (
          <Link href={`/outings/${outing.id}/reflect`}>
            <Button variant="secondary">Share a private reflection</Button>
          </Link>
        )}
        {!isHost && (
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition-colors hover:text-danger"
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Report this outing
          </button>
        )}
      </div>

      {/* Join sheet */}
      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)} title={outing.approvalMode === "open" ? "Join this outing" : "Ask to join"}>
        {outing.hostPrompt && (
          <p className="mb-3 rounded-xl bg-sand-100 px-3.5 py-2.5 text-sm italic leading-relaxed text-ink-soft">
            {outing.host?.displayName.split(" ")[0] ?? "The host"} asks: “{outing.hostPrompt}”
          </p>
        )}
        <Textarea
          label="A note to the host"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteError(null);
          }}
          rows={4}
          maxLength={400}
          placeholder="Say hello, answer their question, or share why this plan speaks to you."
          error={noteError ?? undefined}
          hint={`${note.length}/400`}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setJoinOpen(false)}>
            Cancel
          </Button>
          <Button onClick={sendJoin} loading={joinMutation.isPending}>
            {outing.approvalMode === "open" ? "Join" : "Send request"}
          </Button>
        </div>
      </Sheet>

      {/* Cancel sheet */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this outing?">
        <p className="text-sm leading-relaxed text-ink-soft">
          Everyone who joined will be notified gently, pending requests will be closed, and a
          note will be posted in the chat. This can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={patchMutation.isPending}
            onClick={() => patchMutation.mutate({ action: "cancel" })}
          >
            Cancel outing
          </Button>
        </div>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit wording" wide>
        <div className="space-y-4">
          <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={80} />
          <Textarea label="Pitch" value={editPitch} onChange={(e) => setEditPitch(e.target.value)} rows={5} maxLength={600} />
          <p className="text-xs text-ink-faint">Members are notified when details change.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={patchMutation.isPending}
              onClick={() => patchMutation.mutate({ action: "edit", title: editTitle, pitch: editPitch })}
            >
              Save changes
            </Button>
          </div>
        </div>
      </Sheet>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        subjectType="outing"
        subjectId={outing.id}
        subjectName="this outing"
      />
    </div>
  );
}
