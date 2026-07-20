import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outings, outingMembers, joinRequests, conversations, messages } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { isSafeId, sanitizeText } from "@/lib/security/sanitize";
import { serializeOuting } from "@/lib/server/serializers";
import { getBlockedIdsFor } from "@/lib/matching/eligibility";
import { notify } from "@/lib/server/notify";
import { newId } from "@/lib/server/ids";

/**
 * GET   /api/outings/[id] — outing detail (venue only for host/members).
 * PATCH /api/outings/[id] — host actions: cancel, or edit the pitch copy.
 *
 * Cancellation notifies every confirmed member, closes pending requests and
 * posts a system message in the outing chat (PRD §15 edge cases).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, params }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");

  const blocked = await getBlockedIdsFor(session.user.id);
  if (blocked.has(outing.hostId)) throw new ApiError(404, "Outing not found.");

  return ok({ outing: await serializeOuting(outing, session.user.id) });
});

const patchSchema = z.object({
  action: z.enum(["cancel", "edit"]),
  title: z.string().min(6).max(80).optional(),
  pitch: z.string().min(30).max(600).optional(),
  hostPrompt: z.string().max(200).optional(),
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");
  const body = await parseBody(req, patchSchema);

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");
  if (outing.hostId !== session.user.id) {
    throw new ApiError(403, "Only the host can manage this outing.");
  }
  if (outing.status === "cancelled" || outing.status === "completed") {
    throw new ApiError(409, "This outing is no longer active.");
  }

  const now = Date.now();

  if (body.action === "edit") {
    await db
      .update(outings)
      .set({
        title: body.title !== undefined ? sanitizeText(body.title) : outing.title,
        pitch: body.pitch !== undefined ? sanitizeText(body.pitch) : outing.pitch,
        hostPrompt:
          body.hostPrompt !== undefined ? sanitizeText(body.hostPrompt) : outing.hostPrompt,
        updatedAt: now,
      })
      .where(eq(outings.id, id));

    // Notify confirmed members of meaningful changes (PRD §15).
    const members = await db
      .select()
      .from(outingMembers)
      .where(eq(outingMembers.outingId, id));
    for (const m of members) {
      if (m.userId === session.user.id || m.attendanceStatus !== "confirmed") continue;
      await notify(m.userId, "outing_updated", {
        title: "An outing you joined was updated",
        body: `"${outing.title}" has updated details — take a quick look.`,
        href: `/outings/${id}`,
      });
    }
  } else {
    // Cancel.
    await db.update(outings).set({ status: "cancelled", updatedAt: now }).where(eq(outings.id, id));

    const members = await db
      .select()
      .from(outingMembers)
      .where(eq(outingMembers.outingId, id));
    for (const m of members) {
      if (m.userId !== session.user.id) {
        await db
          .update(outingMembers)
          .set({ attendanceStatus: "cancelled" })
          .where(and(eq(outingMembers.outingId, id), eq(outingMembers.userId, m.userId)));
        if (m.attendanceStatus === "confirmed") {
          await notify(m.userId, "outing_cancelled", {
            title: "An outing was cancelled",
            body: `"${outing.title}" won't be going ahead. Your host sent it off with thanks.`,
            href: `/discover?tab=outings`,
          });
        }
      }
    }

    // Close pending requests quietly.
    await db
      .update(joinRequests)
      .set({ status: "closed", decidedAt: now })
      .where(and(eq(joinRequests.outingId, id), eq(joinRequests.status, "pending")));

    // System note in the outing chat.
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.outingId, id))
      .limit(1);
    if (conv) {
      await db.insert(messages).values({
        id: newId("msg"),
        conversationId: conv.id,
        senderId: "system",
        body: "This outing has been cancelled by the host. Thanks for being open to it — more possibilities are in your next Soul Drop.",
        moderationState: "clear",
        createdAt: now,
      });
      await db.update(conversations).set({ status: "closed" }).where(eq(conversations.id, conv.id));
    }
  }

  const [updated] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  return ok({ outing: await serializeOuting(updated, session.user.id) });
});
