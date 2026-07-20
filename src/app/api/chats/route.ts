import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, messages, outings, outingMembers } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";
import { profilesByIds } from "@/lib/server/serializers";

/**
 * GET /api/chats
 * The viewer's conversations. Chat exists only where a real connection
 * exists — outing groups the viewer belongs to (PRD: no open DMs).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const userId = session.user.id;

  const memberships = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.userId, userId));
  const activeOutingIds = memberships
    .filter((m) => ["confirmed", "attended"].includes(m.attendanceStatus))
    .map((m) => m.outingId);
  if (activeOutingIds.length === 0) return ok({ chats: [] });

  const convs = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.outingId, activeOutingIds));
  if (convs.length === 0) return ok({ chats: [] });

  const outingRows = await db
    .select()
    .from(outings)
    .where(inArray(outings.id, activeOutingIds));
  const outingById = new Map(outingRows.map((o) => [o.id, o]));

  const chats = [];
  for (const conv of convs) {
    const outing = conv.outingId ? outingById.get(conv.outingId) : undefined;
    if (!outing) continue;

    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const members = await db
      .select()
      .from(outingMembers)
      .where(eq(outingMembers.outingId, outing.id));
    const active = members.filter((m) =>
      ["confirmed", "attended"].includes(m.attendanceStatus)
    );
    const profileMap = await profilesByIds(active.map((m) => m.userId));

    chats.push({
      id: conv.id,
      status: conv.status,
      outing: {
        id: outing.id,
        title: outing.title,
        category: outing.category,
        startsAt: outing.startsAt,
        status: outing.status,
      },
      members: active
        .filter((m) => profileMap.has(m.userId))
        .map((m) => ({ ...profileMap.get(m.userId)!, role: m.role })),
      lastMessage: lastMessage
        ? {
            body:
              lastMessage.moderationState === "removed"
                ? "(message removed)"
                : lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
          }
        : null,
    });
  }

  chats.sort((a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0));
  return ok({ chats });
});
