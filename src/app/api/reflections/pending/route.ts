import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingMembers, feedback } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";
import { serializeOuting, profilesByIds } from "@/lib/server/serializers";

/**
 * GET /api/reflections/pending
 * Past outings the viewer was part of that don't have a reflection yet —
 * powers the gentle next-day prompt (PRD §9).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const userId = session.user.id;
  const now = Date.now();

  const memberships = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.userId, userId));
  const activeIds = memberships
    .filter((m) => ["confirmed", "attended"].includes(m.attendanceStatus))
    .map((m) => m.outingId);
  if (activeIds.length === 0) return ok({ pending: [] });

  const past = await db
    .select()
    .from(outings)
    .where(and(inArray(outings.id, activeIds), lt(outings.startsAt, now)));
  const candidates = past.filter((o) => o.status !== "cancelled");
  if (candidates.length === 0) return ok({ pending: [] });

  const done = await db
    .select({ outingId: feedback.outingId })
    .from(feedback)
    .where(
      and(
        inArray(
          feedback.outingId,
          candidates.map((o) => o.id)
        ),
        eq(feedback.authorId, userId)
      )
    );
  const doneIds = new Set(done.map((d) => d.outingId));

  const pendingOutings = candidates.filter((o) => !doneIds.has(o.id));

  const pending = await Promise.all(
    pendingOutings.map(async (o) => {
      const serialized = await serializeOuting(o, userId);
      const members = await db
        .select()
        .from(outingMembers)
        .where(eq(outingMembers.outingId, o.id));
      const others = members.filter(
        (m) => m.userId !== userId && ["confirmed", "attended"].includes(m.attendanceStatus)
      );
      const profileMap = await profilesByIds(others.map((m) => m.userId));
      return {
        outing: serialized,
        companions: others
          .filter((m) => profileMap.has(m.userId))
          .map((m) => profileMap.get(m.userId)!),
      };
    })
  );

  return ok({ pending });
});
