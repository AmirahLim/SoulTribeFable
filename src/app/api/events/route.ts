import { z } from "zod";
import { db } from "@/lib/db/client";
import { recommendationEvents } from "@/lib/db/schema";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { newId } from "@/lib/server/ids";

const eventSchema = z.object({
  objectType: z.enum(["recommendation", "outing", "person", "screen"]),
  objectId: z.string().max(64),
  eventType: z.enum(["viewed", "clicked", "saved", "dismissed", "requested"]),
});

/**
 * POST /api/events
 * Minimal first-party analytics for the learning loop (PRD §9) — which
 * recommendations get viewed/acted on. No third-party trackers, ever.
 */
export const POST = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, eventSchema);
  await db.insert(recommendationEvents).values({
    id: newId("evt"),
    userId: session.user.id,
    objectType: body.objectType,
    objectId: body.objectId,
    eventType: body.eventType,
    createdAt: Date.now(),
  });
  return ok({ recorded: true });
});
