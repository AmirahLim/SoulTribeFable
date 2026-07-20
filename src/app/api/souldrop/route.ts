import { apiHandler, ok, ApiError } from "@/lib/api/handler";
import { getOrCreateSoulDrop, suggestOutings } from "@/lib/server/matchingService";
import { serializeOuting, profilesByIds } from "@/lib/server/serializers";

/**
 * GET /api/souldrop
 * The weekly Soul Drop: 3–5 curated people + a few outing suggestions.
 * Deliberately small — no infinite feed, per PRD §5/§7.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  if (!session.user.onboardingComplete) {
    throw new ApiError(409, "Finish your Friendship DNA first to unlock your Soul Drop.");
  }

  const drop = await getOrCreateSoulDrop(session.user.id);
  const profileMap = await profilesByIds(drop.map((d) => d.candidateId));

  const people = drop
    .filter((d) => profileMap.has(d.candidateId))
    .map((d) => ({
      recommendationId: d.id,
      profile: profileMap.get(d.candidateId)!,
      band: d.scoreBand,
      explanation: d.reasonJson,
      status: d.status,
    }));

  const outings = await suggestOutings(session.user.id, 3);
  const serializedOutings = await Promise.all(
    outings.map((o) => serializeOuting(o, session.user.id))
  );

  return ok({ people, outings: serializedOutings, weekKey: drop[0]?.weekKey ?? null });
});
