import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outings, outingMembers, conversations, messages } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";
import { notify } from "@/lib/server/notify";
import { newId } from "@/lib/server/ids";

const attendanceSchema = z.object({
  action: z.enum(["withdraw", "remove"]),
  userId: z.string().max(64).optional(), // required for host "remove"
});

/**
 * POST /api/outings/[id]/attendance
 * - Member withdraws themselves (frees a spot; outing reopens if it was full).
 * - Host removes a member (kind copy, member notified without blame).
 */
export const POST = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");
  const body = await parseBody(req, attendanceSchema);

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");

  const now = Date.now();
  const isHost = outing.hostId === session.user.id;

  let targetId: string;
  let newStatus: "withdrawn" | "removed";

  if (body.action === "withdraw") {
    targetId = session.user.id;
    newStatus = "withdrawn";
    if (isHost) {
      throw new ApiError(409, "Hosts can't withdraw — cancel the outing instead.");
    }
  } else {
    if (!isHost) throw new ApiError(403, "Only the host can remove members.");
    if (!body.userId || !isSafeId(body.userId)) throw new ApiError(400, "Choose a member.");
    if (body.userId === outing.hostId) throw new ApiError(409, "The host can't be removed.");
    targetId = body.userId;
    newStatus = "removed";
  }

  const [member] = await db
    .select()
    .from(outingMembers)
    .where(and(eq(outingMembers.outingId, id), eq(outingMembers.userId, targetId)))
    .limit(1);
  if (!member || member.attendanceStatus !== "confirmed") {
    throw new ApiError(404, "That member isn't part of this outing.");
  }

  await db
    .update(outingMembers)
    .set({ attendanceStatus: newStatus })
    .where(and(eq(outingMembers.outingId, id), eq(outingMembers.userId, targetId)));

  // A freed spot reopens a full outing.
  if (outing.status === "full") {
    await db
      .update(outings)
      .set({ status: "published", updatedAt: now })
      .where(eq(outings.id, id));
  }

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
      body:
        newStatus === "withdrawn"
          ? "A member has stepped back from this outing."
          : "The host has adjusted the group for this outing.",
      moderationState: "clear",
      createdAt: now,
    });
  }

  if (newStatus === "withdrawn") {
    await notify(outing.hostId, "host_action_needed", {
      title: "A spot just opened up",
      body: `Someone stepped back from "${outing.title}" — you may want to review waiting requests.`,
      href: `/outings/${id}/requests`,
    });
  } else {
    await notify(targetId, "removed_from_outing", {
      title: "About an outing",
      body: `The host adjusted the group for "${outing.title}" and your spot was released. More picks are coming in your Soul Drop.`,
      href: "/discover?tab=outings",
    });
  }

  return ok({ status: newStatus });
});
