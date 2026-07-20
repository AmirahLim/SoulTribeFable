import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingPreferences, outingMembers, conversations, messages } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { outingCreateSchema } from "@/lib/validation/schemas";
import { sanitizeText, sanitizeMultiline } from "@/lib/security/sanitize";
import { newId } from "@/lib/server/ids";
import { serializeOuting } from "@/lib/server/serializers";

/**
 * POST /api/outings
 * Create ("pitch") an outing. Rate-limited under `outingCreate` (6/hour) to
 * prevent spam. The host is auto-enrolled as a member and an outing
 * conversation is opened with a system welcome (PRD §8).
 */
export const POST = apiHandler({ scope: "outingCreate" }, async ({ session, req }) => {
  if (!session.user.onboardingComplete) {
    throw new ApiError(409, "Finish your Friendship DNA before hosting an outing.");
  }

  const body = await parseBody(req, outingCreateSchema);
  const now = Date.now();

  if (body.startsAt <= now + 60 * 60 * 1000) {
    throw new ApiError(400, "Outings need to start at least an hour from now.");
  }
  const deadline = body.startsAt - body.requestDeadlineHoursBefore * 60 * 60 * 1000;
  if (deadline <= now) {
    throw new ApiError(400, "That request deadline has already passed — pick a later start.");
  }

  const outingId = newId("out");
  await db.insert(outings).values({
    id: outingId,
    hostId: session.user.id,
    title: sanitizeText(body.title),
    pitch: sanitizeMultiline(body.pitch),
    category: body.category,
    startsAt: body.startsAt,
    durationMins: body.durationMins,
    timezone: "Asia/Singapore",
    area: body.area,
    venueName: sanitizeText(body.venueName),
    venueAddress: sanitizeText(body.venueAddress),
    capacity: body.capacity,
    groupFormat: body.groupFormat,
    visibility: body.visibility,
    approvalMode: body.approvalMode,
    requestDeadline: deadline,
    status: "published",
    hostPrompt: sanitizeText(body.hostPrompt ?? ""),
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(outingPreferences).values({
    outingId,
    budgetBand: body.preferences.budgetBand,
    energyLevel: body.preferences.energyLevel,
    conversationDepth: body.preferences.conversationDepth,
    structured: body.preferences.structured,
    alcoholFree: body.preferences.alcoholFree,
    indoor: body.preferences.indoor,
    wheelchairAccessible: body.preferences.wheelchairAccessible,
    languages: body.preferences.languages,
    firstTimerFriendly: body.preferences.firstTimerFriendly,
    minFitBand: body.preferences.minFitBand,
  });

  // Host joins their own outing.
  await db.insert(outingMembers).values({
    outingId,
    userId: session.user.id,
    role: "host",
    attendanceStatus: "confirmed",
    joinedAt: now,
  });

  // Outing group chat with a warm system opener.
  const conversationId = newId("cnv");
  await db.insert(conversations).values({
    id: conversationId,
    type: "outing",
    outingId,
    status: "open",
    createdAt: now,
  });
  await db.insert(messages).values({
    id: newId("msg"),
    conversationId,
    senderId: "system",
    body: "Welcome! This chat opens up as people are accepted. Exact venue details are shared here with confirmed members.",
    moderationState: "clear",
    createdAt: now,
  });

  const [created] = await db.select().from(outings).where(eq(outings.id, outingId)).limit(1);
  const serialized = await serializeOuting(created, session.user.id);
  return ok({ outing: serialized });
});
