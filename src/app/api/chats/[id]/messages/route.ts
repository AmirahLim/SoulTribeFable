import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, messages, outings, outingMembers } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { messageSchema } from "@/lib/validation/schemas";
import { isSafeId, sanitizeMultiline, looksLikeInjection } from "@/lib/security/sanitize";
import { profilesByIds } from "@/lib/server/serializers";
import { notify } from "@/lib/server/notify";
import { newId } from "@/lib/server/ids";

/** Membership gate shared by GET and POST. */
async function requireMembership(conversationId: string, userId: string) {
  if (!isSafeId(conversationId)) throw new ApiError(404, "Conversation not found.");
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || !conv.outingId) throw new ApiError(404, "Conversation not found.");

  const [member] = await db
    .select()
    .from(outingMembers)
    .where(
      and(eq(outingMembers.outingId, conv.outingId), eq(outingMembers.userId, userId))
    )
    .limit(1);
  if (!member || !["confirmed", "attended"].includes(member.attendanceStatus)) {
    throw new ApiError(404, "Conversation not found."); // don't leak existence
  }
  return conv;
}

/**
 * GET  /api/chats/[id]/messages — message history (members only).
 * POST /api/chats/[id]/messages — send a message (messaging rate scope).
 * Chat only exists between matched/accepted people (PRD §11).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, params }) => {
  const conv = await requireMembership(params?.id ?? "", session.user.id);

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(asc(messages.createdAt))
    .limit(300);

  const senderIds = Array.from(new Set(rows.map((m) => m.senderId))).filter(
    (id) => id !== "system"
  );
  const profileMap = await profilesByIds(senderIds);

  return ok({
    conversationId: conv.id,
    status: conv.status,
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      sender: m.senderId === "system" ? null : profileMap.get(m.senderId) ?? null,
      body: m.moderationState === "removed" ? "(message removed)" : m.body,
      moderationState: m.moderationState,
      createdAt: m.createdAt,
    })),
  });
});

export const POST = apiHandler({ scope: "messaging" }, async ({ session, params, req }) => {
  const conv = await requireMembership(params?.id ?? "", session.user.id);
  if (conv.status === "closed") {
    throw new ApiError(409, "This conversation has been closed.");
  }

  const body = await parseBody(req, messageSchema);
  const text = sanitizeMultiline(body.body);
  if (!text) throw new ApiError(400, "Say something first.");

  const now = Date.now();
  const message = {
    id: newId("msg"),
    conversationId: conv.id,
    senderId: session.user.id,
    body: text,
    // Light-touch moderation flag for the safety queue; message still posts.
    moderationState: looksLikeInjection(text) ? ("flagged" as const) : ("clear" as const),
    createdAt: now,
  };
  await db.insert(messages).values(message);

  // Notify other confirmed members (kept simple; UI polls for the thread itself).
  if (conv.outingId) {
    const [outing] = await db
      .select()
      .from(outings)
      .where(eq(outings.id, conv.outingId))
      .limit(1);
    const members = await db
      .select()
      .from(outingMembers)
      .where(eq(outingMembers.outingId, conv.outingId));
    for (const m of members) {
      if (m.userId === session.user.id) continue;
      if (!["confirmed", "attended"].includes(m.attendanceStatus)) continue;
      await notify(m.userId, "new_message", {
        title: "New message",
        body: `New message in "${outing?.title ?? "your outing"}".`,
        href: `/chats/${conv.id}`,
      });
    }
  }

  return ok({ message });
});
