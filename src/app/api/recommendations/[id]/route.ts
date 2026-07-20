import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { matchRecommendations, recommendationEvents, savedItems } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";
import { newId } from "@/lib/server/ids";

const statusSchema = z.object({
  status: z.enum(["viewed", "saved", "dismissed"]),
});

/**
 * PATCH /api/recommendations/[id]
 * Mark a Soul Drop card viewed / saved / dismissed. Dismissals feed the
 * learning loop via recommendation_events; saves also land in saved_items.
 */
export const PATCH = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Recommendation not found.");
  const body = await parseBody(req, statusSchema);

  const [rec] = await db
    .select()
    .from(matchRecommendations)
    .where(
      and(eq(matchRecommendations.id, id), eq(matchRecommendations.viewerId, session.user.id))
    )
    .limit(1);
  if (!rec) throw new ApiError(404, "Recommendation not found.");

  // "viewed" never downgrades a saved/dismissed card.
  const next =
    body.status === "viewed" && rec.status !== "fresh" ? rec.status : body.status;

  await db
    .update(matchRecommendations)
    .set({ status: next })
    .where(eq(matchRecommendations.id, id));

  await db.insert(recommendationEvents).values({
    id: newId("evt"),
    userId: session.user.id,
    objectType: "recommendation",
    objectId: id,
    eventType: body.status,
    createdAt: Date.now(),
  });

  if (body.status === "saved") {
    const existing = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.userId, session.user.id),
          eq(savedItems.objectType, "person"),
          eq(savedItems.objectId, rec.candidateId)
        )
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(savedItems).values({
        userId: session.user.id,
        objectType: "person",
        objectId: rec.candidateId,
        createdAt: Date.now(),
      });
    }
  }

  return ok({ status: next });
});
