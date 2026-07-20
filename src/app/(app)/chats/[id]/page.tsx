"use client";

/**
 * Chat thread — polling-based messaging inside an outing group (PRD §11).
 * Chat exists only between people connected through an accepted plan.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { SendHorizonal, CalendarHeart } from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime, formatSingapore } from "@/lib/utils";
import type { PublicProfile } from "@/lib/server/serializers";

interface ThreadMessage {
  id: string;
  senderId: string;
  sender: PublicProfile | null;
  body: string;
  moderationState: string;
  createdAt: number;
}

interface ThreadResponse {
  conversationId: string;
  status: string;
  messages: ThreadMessage[];
}

interface ChatSummary {
  id: string;
  outing: { id: string; title: string; category: string; startsAt: number; status: string };
  members: (PublicProfile & { role: string })[];
}

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const chatId = params.id;
  const { viewer } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const myId = viewer?.user.id;

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const threadQuery = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => api.get<ThreadResponse>(`/api/chats/${chatId}/messages`),
    refetchInterval: 4000, // gentle polling; PRD doesn't require realtime infra
  });

  // Outing context for the header (title, when, who).
  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: () => api.get<{ chats: ChatSummary[] }>("/api/chats"),
    staleTime: 60000,
  });
  const chatMeta = useMemo(
    () => chatsQuery.data?.chats.find((c) => c.id === chatId),
    [chatsQuery.data, chatId]
  );

  const send = useMutation({
    mutationFn: (body: string) => api.post(`/api/chats/${chatId}/messages`, { body }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError && err.status === 429
          ? "You're sending messages quickly — take a breath and try again shortly."
          : "That message didn't send — please try again.";
      toast(msg, "error");
    },
  });

  const messages = threadQuery.data?.messages ?? [];

  // Auto-scroll on new messages.
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate(body);
  };

  const closed = threadQuery.data?.status === "closed";

  return (
    <div className="flex min-h-[70vh] flex-col">
      <PageHeader
        back
        eyebrow="Outing chat"
        title={chatMeta?.outing.title ?? "Conversation"}
        subtitle={
          chatMeta
            ? `${formatSingapore(chatMeta.outing.startsAt)} · ${
                chatMeta.members.length
              } of you`
            : undefined
        }
        action={
          chatMeta ? (
            <Link
              href={`/outings/${chatMeta.outing.id}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-sand-200 bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <CalendarHeart className="h-3.5 w-3.5 text-terracotta-600" aria-hidden />
              View outing
            </Link>
          ) : undefined
        }
      />

      {threadQuery.isLoading ? (
        <ListSkeleton count={4} lines={1} />
      ) : threadQuery.isError ? (
        <ErrorState onRetry={() => threadQuery.refetch()} />
      ) : messages.length === 0 ? (
        <EmptyState
          emoji="👋"
          title="Break the ice"
          body="A simple 'looking forward to this!' goes a long way. Everyone here said yes to the same plan."
        />
      ) : (
        <ol className="flex-1 space-y-3" aria-label="Messages">
          {messages.map((m, i) => {
            const mine = m.senderId === myId;
            const system = m.senderId === "system";
            const prev = messages[i - 1];
            const showSender = !mine && !system && prev?.senderId !== m.senderId;
            if (system) {
              return (
                <li key={m.id} className="py-1 text-center">
                  <span className="rounded-pill bg-surface-sunken px-3 py-1 text-xs italic text-ink-faint">
                    {m.body}
                  </span>
                </li>
              );
            }
            return (
              <li key={m.id} className={clsx("flex gap-2", mine && "justify-end")}>
                {!mine && (
                  <span className={clsx("w-7 shrink-0", !showSender && "invisible")}>
                    {m.sender && (
                      <Avatar seed={m.sender.avatarSeed} name={m.sender.displayName} size="xs" />
                    )}
                  </span>
                )}
                <div className={clsx("max-w-[78%]", mine && "text-right")}>
                  {showSender && m.sender && (
                    <p className="mb-0.5 pl-1 text-[11px] font-semibold text-ink-faint">
                      {m.sender.displayName.split(" ")[0]}
                    </p>
                  )}
                  <div
                    className={clsx(
                      "inline-block rounded-card px-3.5 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "rounded-br-md bg-terracotta-500 text-sand-50"
                        : "rounded-bl-md border border-sand-200 bg-surface-raised text-ink"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-left">{m.body}</p>
                  </div>
                  <p className="mt-0.5 px-1 text-[10px] text-ink-faint">
                    {relativeTime(m.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
          <div ref={bottomRef} />
        </ol>
      )}

      {/* Composer */}
      <div className="sticky bottom-20 mt-6 lg:bottom-4">
        {closed ? (
          <p className="rounded-card border border-sand-200 bg-surface-sunken px-4 py-3 text-center text-sm text-ink-faint">
            This conversation has been closed.
          </p>
        ) : (
          <form
            className="flex items-end gap-2 rounded-card border border-sand-200 bg-surface-raised p-2 shadow-soft"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <label htmlFor="chat-composer" className="sr-only">
              Write a message
            </label>
            <textarea
              id="chat-composer"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || send.isPending}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-terracotta-500 text-sand-50 transition-all hover:bg-terracotta-600 active:scale-95 disabled:opacity-40"
            >
              <SendHorizonal className="h-4 w-4" aria-hidden />
            </button>
          </form>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          Be kind — chats are between people meeting in real life.
        </p>
      </div>
    </div>
  );
}
