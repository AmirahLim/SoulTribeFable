import { apiHandler, ok, ApiError } from "@/lib/api/handler";
import { rankCandidates } from "@/lib/server/matchingService";
import { profilesByIds } from "@/lib/server/serializers";

/**
 * GET /api/discover/people?band=&season=
 * Ranked compatible people beyond the weekly drop. Filters run server-side;
 * results stay intentionally curated (max 18 — no infinite feed).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, req }) => {
  if (!session.user.onboardingComplete) {
    throw new ApiError(409, "Finish your Friendship DNA to browse people.");
  }

  const url = new URL(req.url);
  const band = url.searchParams.get("band");
  const season = url.searchParams.get("season");

  let results = await rankCandidates(session.user.id);
  if (band && ["kindred", "strong", "promising", "worth_exploring"].includes(band)) {
    results = results.filter((r) => r.band === band);
  }

  const profileMap = await profilesByIds(results.map((r) => r.candidateId));

  let people = results
    .filter((r) => profileMap.has(r.candidateId))
    .map((r) => ({
      profile: profileMap.get(r.candidateId)!,
      band: r.band,
      explanation: r.explanation,
    }));

  if (season) {
    people = people.filter((p) => p.profile.lifeSeason === season);
  }

  return ok({ people: people.slice(0, 18) });
});
