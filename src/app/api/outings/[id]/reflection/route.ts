import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingMembers, feedback } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { reflectionSchema } from "@/lib/validation/schemas";
import { isSafeId, sanitizeMultiline } from "@/lib/security/sanitize";
import { newId } from "@/lib/server/ids";

/**
 * POST /api/outings/[id]/reflection
 * Post-outing reflection (PRD §9). Entirely private — never shown to other
 * users, no public ratings. Feeds the matching engine's gentle behavioral
 * signal. One reflection per outing per member.
 */
export const POST = apiHandler({ scope: "api" }, async ({ session, params, req }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Outing not found.");
  const body = await parseBody(req, reflectionSchema);
  const userId = session.user.id;

  const [outing] = await db.select().from(outings).where(eq(outings.id, id)).limit(1);
  if (!outing) throw new ApiError(404, "Outing not found.");

  const [member] = await db
    .select()
    .from(outingMembers)
    .where(and(eq(outingMembers.outingId, id), eq(outingMembers.userId, userId)))
    .limit(1);
  if (!member) throw new ApiError(403, "Reflections are for people who were part of the outing.");

  if (outing.startsAt > Date.now()) {
    throw new ApiError(409, "This outing hasn't happened yet.");
  }

  const existing = await db
    .select({ id: feedback.id })
    .from(feedback)
    .where(and(eq(feedback.outingId, id), eq(feedback.authorId, userId)))
    .limit(1);
  if (existing.length > 0) {
    throw new ApiError(409, "You've already reflected on this outing — thank you.");
  }

  const now = Date.now();
  const privateText = sanitizeMultiline(body.privateText ?? "");

  // Only people who were actually members can be subjects.
  const members = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.outingId, id));
  const memberIds = new Set(members.map((m) => m.userId));
  const subjects = body.subjectIds.filter(
    (sid) => isSafeId(sid) && sid !== userId && memberIds.has(sid)
  );

  if (subjects.length === 0) {
    await db.insert(feedback).values({
      id: newId("fbk"),
      outingId: id,
      authorId: userId,
      subjectId: null,
      attended: body.attended,
      comfort: body.comfort,
      connection: body.connection,
      futureIntent: body.futureIntent,
      privateText,
      createdAt: now,
    });
  } else {
    for (const subjectId of subjects) {
      await db.insert(feedback).values({
        id: newId("fbk"),
        outingId: id,
        authorId: userId,
        subjectId,
        attended: body.attended,
        comfort: body.comfort,
        connection: body.connection,
        futureIntent: body.futureIntent,
        privateText,
        createdAt: now,
      });
    }
  }

  // Mark attendance for the learning loop.
  await db
    .update(outingMembers)
    .set({ attendanceStatus: body.attended ? "attended" : "no_show" })
    .where(and(eq(outingMembers.outingId, id), eq(outingMembers.userId, userId)));

  return ok({ saved: true });
});
