import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles, dnaSummaries } from "@/lib/db/schema";
import { apiHandler, ok, ApiError } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";
import { getBlockedIdsFor } from "@/lib/matching/eligibility";
import { loadSubject, computeMatch } from "@/lib/server/matchingService";
import { serializeProfile } from "@/lib/server/serializers";

/**
 * GET /api/people/[id]
 * A person's public profile + the viewer↔person compatibility explanation.
 * Blocked pairs and hidden profiles return 404 (not 403) to avoid leaking
 * existence. Sensitive DNA answers never appear here — only the person's
 * own public summary sections that they haven't hidden.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, params }) => {
  const id = params?.id;
  if (!id || !isSafeId(id)) throw new ApiError(404, "Person not found.");

  const blocked = await getBlockedIdsFor(session.user.id);
  if (blocked.has(id)) throw new ApiError(404, "Person not found.");

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, id)).limit(1);
  if (!profile || profile.visibility === "hidden") {
    throw new ApiError(404, "Person not found.");
  }

  // Their self-authored DNA summary — hidden sections stay hidden.
  const [summary] = await db
    .select()
    .from(dnaSummaries)
    .where(eq(dnaSummaries.userId, id))
    .limit(1);
  const visibleSections = summary
    ? summary.sections.filter((s) => !s.hidden).map((s) => ({ id: s.id, text: s.text }))
    : [];

  // Compatibility explanation, computed live for freshness.
  let match = null;
  if (id !== session.user.id) {
    const viewer = await loadSubject(session.user.id);
    const candidate = await loadSubject(id);
    if (viewer && candidate) {
      const result = await computeMatch(viewer, candidate);
      match = { band: result.band, explanation: result.explanation };
    }
  }

  return ok({
    profile: serializeProfile(profile),
    summaryHeadline: summary?.headline ?? null,
    summarySections: visibleSections,
    match,
  });
});
