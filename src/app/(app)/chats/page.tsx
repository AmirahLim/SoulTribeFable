"use client";

/**
 * Chats — conversations exist only around outings you're part of
 * (PRD §11: no open DMs; chat unlocks when a host welcomes you in).
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useViewer } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime, CATEGORY_EMOJI, formatSingapore } from "@/lib/utils";
import type { PublicProfile } from "@/lib/server/serializers";

interface ChatSummary {
  id: string;
  status: string;
  outing: { id: string; title: string; category: string; startsAt: number; status: string };
  members: (PublicProfile & { role: string })[];
  lastMessage: { body: string; senderId: string; createdAt: number } | null;
}

export default function ChatsPage() {
  const { viewer } = useViewer();
  const myId = viewer?.user.id;

  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: () => api.get<{ chats: ChatSummary[] }>("/api/chats"),
    refetchInterval: 20000,
  });

  const chats = (chatsQuery.data?.chats ?? [])
    .slice()
    .sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? b.outing.startsAt) -
        (a.lastMessage?.createdAt ?? a.outing.startsAt)
    );

  return (
    <div>
      <PageHeader
        eyebrow="Conversations"
        title="Chats"
        subtitle="Every chat here is tied to a real plan — that's on purpose."
      />

      {chatsQuery.isLoading ? (
        <ListSkeleton count={4} lines={2} />
      ) : chatsQuery.isError ? (
        <ErrorState onRetry={() => chatsQuery.refetch()} />
      ) : chats.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="No conversations yet"
          body="Chats open up when you join an outing or welcome someone into yours. No cold DMs — just people you're actually meeting."
          action={
            <Link href="/discover?tab=outings">
              <Button variant="secondary">Find an outing</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {chats.map((chat) => {
            const others = chat.members.filter((m) => m.userId !== myId);
            const lastSender =
              chat.lastMessage &&
              (chat.lastMessage.senderId === myId
                ? "You"
                : chat.members.find((m) => m.userId === chat.lastMessage!.senderId)
                    ?.displayName.split(" ")[0] ?? null);
            return (
              <li key={chat.id}>
                <Link href={`/chats/${chat.id}`} className="block">
                  <Card className="p-4 transition-transform hover:scale-[1.01]">
                    <div className="flex items-center gap-3">
                      <span className="organic-blob flex h-11 w-11 shrink-0 items-center justify-center bg-sand-100 text-xl">
                        {CATEGORY_EMOJI[chat.outing.category] ?? "🌿"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-display text-base font-medium text-ink">
                            {chat.outing.title}
                          </p>
                          {chat.lastMessage && (
                            <span className="shrink-0 text-[11px] text-ink-faint">
                              {relativeTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-ink-soft">
                          {chat.lastMessage ? (
                            <>
                              {lastSender && (
                                <span className="font-semibold">{lastSender}: </span>
                              )}
                              {chat.lastMessage.body}
                            </>
                          ) : (
                            <span className="italic text-ink-faint">
                              Say hello — you're meeting{" "}
                              {formatSingapore(chat.outing.startsAt, {
                                withDate: true,
                                withTime: false,
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {others.slice(0, 4).map((m) => (
                          <Avatar
                            key={m.userId}
                            seed={m.avatarSeed}
                            name={m.displayName}
                            size="xs"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-ink-faint">
                        {others.length === 1
                          ? `You & ${others[0].displayName.split(" ")[0]}`
                          : `You + ${others.length} others`}
                        {chat.status === "closed" && " · closed"}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
