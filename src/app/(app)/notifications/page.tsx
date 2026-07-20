"use client";

/**
 * Notifications — quiet by design (PRD §12). A simple chronological list;
 * tapping an item marks it read and follows its link.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Sparkles, Inbox, BellRing, MessageCircle, CalendarHeart, ShieldCheck, CheckCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/utils";
import type { ComponentType } from "react";

interface NotificationRow {
  id: string;
  eventType: string;
  payload: { title: string; body: string; href?: string };
  sentAt: number;
  readAt: number | null;
}

const EVENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  soul_drop: Sparkles,
  join_request: Inbox,
  request_accepted: CalendarHeart,
  request_declined: CalendarHeart,
  new_message: MessageCircle,
  outing_reminder: BellRing,
  outing_cancelled: CalendarHeart,
  reflection_nudge: MessageCircle,
  safety: ShieldCheck,
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () =>
      api.get<{ notifications: NotificationRow[]; unreadCount: number }>("/api/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id?: string) => api.patch("/api/notifications", id ? { id } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const rows = query.data?.notifications ?? [];
  const unread = query.data?.unreadCount ?? 0;

  const open = (n: NotificationRow) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.payload.href) router.push(n.payload.href);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Gentle nudges only"
        title="Notifications"
        subtitle="We keep these few and meaningful — no streaks, no noise."
        action={
          unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<CheckCheck className="h-4 w-4" />}
              loading={markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <ListSkeleton count={5} lines={2} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="All quiet"
          body="When something worth your attention happens — a new Soul Drop, a request, a message — it will land here."
          action={
            <Link href="/home">
              <Button variant="secondary">Back to your drop</Button>
            </Link>
          }
        />
      ) : (
        <ol className="space-y-2" aria-label="Notifications">
          {rows.map((n) => {
            const Icon = EVENT_ICONS[n.eventType] ?? BellRing;
            const isUnread = n.readAt === null;
            return (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={clsx(
                    "flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors",
                    isUnread
                      ? "border-terracotta-300/60 bg-terracotta-300/10 hover:bg-terracotta-300/20"
                      : "border-sand-200 bg-surface-raised hover:bg-surface-sunken"
                  )}
                >
                  <span
                    className={clsx(
                      "organic-blob flex h-9 w-9 shrink-0 items-center justify-center",
                      isUnread ? "bg-terracotta-300/30" : "bg-sand-100"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-4 w-4",
                        isUnread ? "text-terracotta-600" : "text-ink-faint"
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={clsx(
                          "truncate text-sm",
                          isUnread ? "font-semibold text-ink" : "font-medium text-ink-soft"
                        )}
                      >
                        {n.payload.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-faint">
                        {relativeTime(n.sentAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                      {n.payload.body}
                    </span>
                  </span>
                  {isUnread && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terracotta-500"
                      aria-label="Unread"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
