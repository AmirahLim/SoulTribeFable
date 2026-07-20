import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { savedItems, outings } from "@/lib/db/schema";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";
import { profilesByIds, serializeOuting } from "@/lib/server/serializers";
import { ApiError } from "@/lib/api/handler";

const saveSchema = z.object({
  objectType: z.enum(["person", "outing"]),
  objectId: z.string().min(1).max(64),
  saved: z.boolean(),
});

/**
 * GET  /api/saved — the viewer's saved people and outings ("possibilities").
 * POST /api/saved — toggle save on a person or outing.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const rows = await db
    .select()
    .from(savedItems)
    .where(eq(savedItems.userId, session.user.id));

  const personIds = rows.filter((r) => r.objectType === "person").map((r) => r.objectId);
  const outingIds = rows.filter((r) => r.objectType === "outing").map((r) => r.objectId);

  const profileMap = await profilesByIds(personIds);
  const people = personIds
    .filter((id) => profileMap.has(id))
    .map((id) => profileMap.get(id)!);

  let savedOutings: Awaited<ReturnType<typeof serializeOuting>>[] = [];
  if (outingIds.length > 0) {
    const outingRows = await db
      .select()
      .from(outings)
      .where(inArray(outings.id, outingIds));
    savedOutings = await Promise.all(
      outingRows.map((o) => serializeOuting(o, session.user.id))
    );
  }

  return ok({ people, outings: savedOutings });
});

export const POST = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, saveSchema);
  if (!isSafeId(body.objectId)) throw new ApiError(400, "Invalid item.");

  const where = and(
    eq(savedItems.userId, session.user.id),
    eq(savedItems.objectType, body.objectType),
    eq(savedItems.objectId, body.objectId)
  );

  if (body.saved) {
    const existing = await db.select().from(savedItems).where(where).limit(1);
    if (existing.length === 0) {
      await db.insert(savedItems).values({
        userId: session.user.id,
        objectType: body.objectType,
        objectId: body.objectId,
        createdAt: Date.now(),
      });
    }
  } else {
    await db.delete(savedItems).where(where);
  }

  return ok({ saved: body.saved });
});
