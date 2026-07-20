import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { joinRequests, outings } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { requestDecisionSchema } from "@/lib/validation/schemas";
import { isSafeId } from "@/lib/security/sanitize";
import { notify } from "@/lib/server/notify";
import { acceptIntoOuting, closeIfFull } from "@/lib/server/outingService";

/**
 * PATCH /api/requests/[id]
 * - Host: accept / decline a pending request. Declines use neutral,
 *   kind copy and never mention compatibility (PRD §8).
 * - Requester: withdraw their own pending request.
 */
export const PATCH = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Request not found.");
  const body = await parseBody(req, requestDecisionSchema);

  const [request] = await db.select().from(joinRequests).where(eq(joinRequests.id, id)).limit(1);
  if (!request) throw new ApiError(404, "Request not found.");

  const [outing] = await db
    .select()
    .from(outings)
    .where(eq(outings.id, request.outingId))
    .limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");

  const isHost = outing.hostId === session.user.id;
  const isRequester = request.requesterId === session.user.id;
  const now = Date.now();

  if (body.decision === "withdraw") {
    if (!isRequester) throw new ApiError(403, "Only the requester can withdraw.");
    if (request.status !== "pending") {
      throw new ApiError(409, "This request has already been decided.");
    }
    await db
      .update(joinRequests)
      .set({ status: "withdrawn", decidedAt: now })
      .where(eq(joinRequests.id, id));
    return ok({ request: { id, status: "withdrawn" } });
  }

  // accept / decline — host only.
  if (!isHost) throw new ApiError(403, "Only the host can decide requests.");
  if (request.status !== "pending") {
    throw new ApiError(409, "This request has already been decided.");
  }
  if (outing.status !== "published") {
    throw new ApiError(409, "This outing is no longer taking members.");
  }

  if (body.decision === "accept") {
    await db
      .update(joinRequests)
      .set({ status: "accepted", decidedAt: now })
      .where(eq(joinRequests.id, id));
    await acceptIntoOuting(outing.id, request.requesterId, outing.title);
    await closeIfFull(outing.id);
    return ok({ request: { id, status: "accepted" } });
  }

  // Decline — neutral, warm copy. No reason is ever attached (PRD §8).
  await db
    .update(joinRequests)
    .set({ status: "declined", decidedAt: now })
    .where(eq(joinRequests.id, id));
  await notify(request.requesterId, "request_declined", {
    title: "About your outing request",
    body: `"${outing.title}" didn't work out this time — the host kept the group small. More picks are on the way in your Soul Drop.`,
    href: "/discover?tab=outings",
  });
  return ok({ request: { id, status: "declined" } });
});
