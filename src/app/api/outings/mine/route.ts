import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingMembers, joinRequests } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";
import { serializeOuting } from "@/lib/server/serializers";

/**
 * GET /api/outings/mine
 * Everything on the viewer's plate: outings they host, outings they've
 * joined, and their own pending/answered requests — grouped for the
 * "My outings" screen and host dashboard.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const userId = session.user.id;

  const hosted = await db.select().from(outings).where(eq(outings.hostId, userId));

  const memberships = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.userId, userId));
  const joinedIds = memberships
    .filter(
      (m) => m.role !== "host" && (m.attendanceStatus === "confirmed" || m.attendanceStatus === "attended")
    )
    .map((m) => m.outingId);
  const joined = joinedIds.length
    ? await db.select().from(outings).where(inArray(outings.id, joinedIds))
    : [];

  const myRequests = await db
    .select()
    .from(joinRequests)
    .where(eq(joinRequests.requesterId, userId));
  const requestOutingIds = myRequests.map((r) => r.outingId);
  const requestOutings = requestOutingIds.length
    ? await db.select().from(outings).where(inArray(outings.id, requestOutingIds))
    : [];
  const outingById = new Map(requestOutings.map((o) => [o.id, o]));

  // Pending host actions: count of pending requests across hosted outings.
  const hostedIds = hosted.map((o) => o.id);
  const pendingForHost = hostedIds.length
    ? (
        await db.select().from(joinRequests).where(inArray(joinRequests.outingId, hostedIds))
      ).filter((r) => r.status === "pending")
    : [];
  const pendingCountByOuting = new Map<string, number>();
  for (const r of pendingForHost) {
    pendingCountByOuting.set(r.outingId, (pendingCountByOuting.get(r.outingId) ?? 0) + 1);
  }

  const serialize = (o: (typeof hosted)[number]) => serializeOuting(o, userId);

  return ok({
    hosting: await Promise.all(
      hosted
        .sort((a, b) => b.startsAt - a.startsAt)
        .map(async (o) => ({
          outing: await serialize(o),
          pendingRequests: pendingCountByOuting.get(o.id) ?? 0,
        }))
    ),
    joined: await Promise.all(joined.sort((a, b) => b.startsAt - a.startsAt).map(serialize)),
    requests: await Promise.all(
      myRequests
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((r) => outingById.has(r.outingId))
        .map(async (r) => ({
          id: r.id,
          status: r.status,
          note: r.note,
          createdAt: r.createdAt,
          outing: await serialize(outingById.get(r.outingId)!),
        }))
    ),
  });
});
