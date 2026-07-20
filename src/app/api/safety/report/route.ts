import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { reportSchema } from "@/lib/validation/schemas";
import { sanitizeMultiline } from "@/lib/security/sanitize";
import { newId } from "@/lib/server/ids";

/** Categories that jump the review queue (PRD §10 severity tiers). */
const HIGH_SEVERITY = new Set(["underage", "unsafe_outing", "harassment"]);

/**
 * POST /api/safety/report
 * File a report on a user, outing or message. Rate-limited under `reports`
 * (10/hour). The reported party is never told who reported them.
 */
export const POST = apiHandler({ scope: "reports" }, async ({ session, req }) => {
  const body = await parseBody(req, reportSchema);

  await db.insert(reports).values({
    id: newId("rpt"),
    reporterId: session.user.id,
    subjectType: body.subjectType,
    subjectId: body.subjectId,
    category: body.category,
    details: sanitizeMultiline(body.details ?? ""),
    status: "open",
    severity: HIGH_SEVERITY.has(body.category) ? "high" : "medium",
    createdAt: Date.now(),
  });

  return ok({
    received: true,
    message:
      "Thank you for telling us. Our team reviews every report — you won't be identified to anyone involved.",
  });
});
