import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingMembers, joinRequests } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { joinRequestSchema } from "@/lib/validation/schemas";
import { isSafeId, sanitizeMultiline } from "@/lib/security/sanitize";
import { getBlockedIdsFor } from "@/lib/matching/eligibility";
import { loadSubject, computeMatch } from "@/lib/server/matchingService";
import { profilesByIds } from "@/lib/server/serializers";
import { notify } from "@/lib/server/notify";
import { newId } from "@/lib/server/ids";
import { acceptIntoOuting, closeIfFull, minFitBandFor } from "@/lib/server/outingService";

const BAND_ORDER = ["worth_exploring", "promising", "strong", "kindred"] as const;

/**
 * GET  /api/outings/[id]/requests — host only: requests with requester
 *       profiles and host-facing fit context (PRD §8).
 * POST /api/outings/[id]/requests — request to join (or instant-join when
 *       approvalMode is "open"). Enforces capacity, deadline, blocks,
 *       minimum fit band and one-active-request-per-outing.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, params }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");
  if (outing.hostId !== session.user.id) {
    throw new ApiError(403, "Only the host can review requests.");
  }

  const rows = await db.select().from(joinRequests).where(eq(joinRequests.outingId, id));
  const profileMap = await profilesByIds(rows.map((r) => r.requesterId));

  const requests = rows
    .filter((r) => profileMap.has(r.requesterId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt,
      profile: profileMap.get(r.requesterId)!,
      fit: r.fitJson, // host-facing explanation, never a raw score
    }));

  return ok({ requests });
});

export const POST = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");
  const body = await parseBody(req, joinRequestSchema);
  const userId = session.user.id;
  const now = Date.now();

  if (!session.user.onboardingComplete) {
    throw new ApiError(409, "Finish your Friendship DNA before joining outings.");
  }

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");
  if (outing.hostId === userId) throw new ApiError(409, "You're hosting this one!");

  const blocked = await getBlockedIdsFor(userId);
  if (blocked.has(outing.hostId)) throw new ApiError(404, "Outing not found.");

  if (outing.status !== "published") {
    throw new ApiError(409, "This outing isn't taking requests right now.");
  }
  if (now > outing.requestDeadline) {
    throw new ApiError(409, "Requests for this outing have closed.");
  }

  // Capacity check (host doesn't consume capacity).
  const members = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.outingId, id));
  const confirmed = members.filter(
    (m) => m.userId !== outing.hostId && m.attendanceStatus === "confirmed"
  );
  if (confirmed.length >= outing.capacity) {
    throw new ApiError(409, "This outing just filled up — more are coming in your next drop.");
  }
  if (members.some((m) => m.userId === userId && m.attendanceStatus === "confirmed")) {
    throw new ApiError(409, "You're already in!");
  }

  // One active request per outing.
  const existing = await db
    .select()
    .from(joinRequests)
    .where(and(eq(joinRequests.outingId, id), eq(joinRequests.requesterId, userId)));
  if (existing.some((r) => r.status === "pending")) {
    throw new ApiError(409, "Your request is already with the host.");
  }

  // Compute fit for the host's context and enforce the outing's minimum band.
  const requester = await loadSubject(userId);
  const host = await loadSubject(outing.hostId);
  let fitJson = null;
  if (requester && host) {
    const result = await computeMatch(host, requester); // host's perspective
    fitJson = result.explanation;
    const minIdx = BAND_ORDER.indexOf(
      (await minFitBandFor(id)) as (typeof BAND_ORDER)[number]
    );
    const gotIdx = BAND_ORDER.indexOf(result.band);
    if (minIdx > 0 && gotIdx < minIdx) {
      // Neutral copy — never "you were rejected for low compatibility".
      throw new ApiError(
        409,
        "This one isn't quite the right shape for you — your Soul Drop has better-suited picks."
      );
    }
  }

  const requestId = newId("req");
  const note = sanitizeMultiline(body.note);

  if (outing.approvalMode === "open") {
    // Instant join.
    await db.insert(joinRequests).values({
      id: requestId,
      outingId: id,
      requesterId: userId,
      note,
      status: "accepted",
      fitJson,
      createdAt: now,
      decidedAt: now,
    });
    await acceptIntoOuting(id, userId, outing.title);
    await closeIfFull(id);
    return ok({ request: { id: requestId, status: "accepted" } });
  }

  await db.insert(joinRequests).values({
    id: requestId,
    outingId: id,
    requesterId: userId,
    note,
    status: "pending",
    fitJson,
    createdAt: now,
    decidedAt: null,
  });

  await notify(outing.hostId, "join_request_received", {
    title: "Someone would like to join your outing",
    body: `A new request just arrived for "${outing.title}".`,
    href: `/outings/${id}/requests`,
  });

  return ok({ request: { id: requestId, status: "pending" } });
});
