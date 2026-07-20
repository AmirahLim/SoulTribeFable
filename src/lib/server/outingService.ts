import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  conversations,
  messages,
  outingMembers,
  outingPreferences,
  outings,
  joinRequests,
} from "@/lib/db/schema";
import { notify } from "./notify";
import { newId } from "./ids";

/**
 * Outing membership state machine helpers shared by the request-creation
 * and host-decision routes.
 */

export async function minFitBandFor(outingId: string): Promise<string> {
  const [prefs] = await db
    .select()
    .from(outingPreferences)
    .where(eq(outingPreferences.outingId, outingId))
    .limit(1);
  return prefs?.minFitBand ?? "worth_exploring";
}

/** Accept path: membership + chat system note + notification to the member. */
export async function acceptIntoOuting(
  outingId: string,
  userId: string,
  outingTitle: string
) {
  const now = Date.now();
  const existing = await db
    .select()
    .from(outingMembers)
    .where(and(eq(outingMembers.outingId, outingId), eq(outingMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(outingMembers)
      .set({ attendanceStatus: "confirmed" })
      .where(and(eq(outingMembers.outingId, outingId), eq(outingMembers.userId, userId)));
  } else {
    await db.insert(outingMembers).values({
      outingId,
      userId,
      role: "attendee",
      attendanceStatus: "confirmed",
      joinedAt: now,
    });
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.outingId, outingId))
    .limit(1);
  if (conv) {
    await db.insert(messages).values({
      id: newId("msg"),
      conversationId: conv.id,
      senderId: "system",
      body: "A new member just joined the outing. Say hello!",
      moderationState: "clear",
      createdAt: now,
    });
  }

  await notify(userId, "request_accepted", {
    title: "You're in!",
    body: `Your request for "${outingTitle}" was accepted. The exact venue is now visible, and the group chat is open.`,
    href: `/outings/${outingId}`,
  });
}

/**
 * If the outing just reached capacity: mark it full and close remaining
 * pending requests with neutral copy (PRD §15).
 */
export async function closeIfFull(outingId: string) {
  const [outing] = await db.select().from(outings).where(eq(outings.id, outingId)).limit(1);
  if (!outing || outing.status !== "published") return;

  const members = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.outingId, outingId));
  const confirmed = members.filter(
    (m) => m.userId !== outing.hostId && m.attendanceStatus === "confirmed"
  );
  if (confirmed.length < outing.capacity) return;

  const now = Date.now();
  await db.update(outings).set({ status: "full", updatedAt: now }).where(eq(outings.id, outingId));

  const pending = await db
    .select()
    .from(joinRequests)
    .where(and(eq(joinRequests.outingId, outingId), eq(joinRequests.status, "pending")));
  for (const r of pending) {
    await db
      .update(joinRequests)
      .set({ status: "closed", decidedAt: now })
      .where(eq(joinRequests.id, r.id));
    await notify(r.requesterId, "request_declined", {
      title: "That outing filled up",
      body: `"${outing.title}" is now full. Your next Soul Drop will have more picks like it.`,
      href: "/discover?tab=outings",
    });
  }
}
