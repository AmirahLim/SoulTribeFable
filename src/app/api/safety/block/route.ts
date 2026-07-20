import { and, eq, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { blocks, matchRecommendations, savedItems } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";
import { profilesByIds } from "@/lib/server/serializers";

const blockSchema = z.object({
  userId: z.string().max(64),
  blocked: z.boolean(),
});

/**
 * GET  /api/safety/block — people the viewer has blocked.
 * POST /api/safety/block — block/unblock. Blocking immediately removes the
 * pair from each other's recommendations in both directions (PRD §10);
 * the blocked person is never notified.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const rows = await db
    .select()
    .from(blocks)
    .where(eq(blocks.blockerId, session.user.id));
  const profileMap = await profilesByIds(rows.map((r) => r.blockedId));
  return ok({
    blocked: rows
      .filter((r) => profileMap.has(r.blockedId))
      .map((r) => ({ profile: profileMap.get(r.blockedId)!, since: r.createdAt })),
  });
});

export const POST = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, blockSchema);
  if (!isSafeId(body.userId)) throw new ApiError(400, "Unknown user.");
  if (body.userId === session.user.id) throw new ApiError(400, "You can't block yourself.");

  const me = session.user.id;
  const them = body.userId;

  if (body.blocked) {
    const existing = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, me), eq(blocks.blockedId, them)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(blocks).values({ blockerId: me, blockedId: them, createdAt: Date.now() });
    }

    // Scrub recommendations in both directions immediately.
    await db
      .delete(matchRecommendations)
      .where(
        or(
          and(
            eq(matchRecommendations.viewerId, me),
            eq(matchRecommendations.candidateId, them)
          ),
          and(
            eq(matchRecommendations.viewerId, them),
            eq(matchRecommendations.candidateId, me)
          )
        )
      );
    // And un-save them.
    await db
      .delete(savedItems)
      .where(
        and(
          eq(savedItems.userId, me),
          eq(savedItems.objectType, "person"),
          eq(savedItems.objectId, them)
        )
      );
  } else {
    await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, me), eq(blocks.blockedId, them)));
  }

  return ok({ blocked: body.blocked });
});
