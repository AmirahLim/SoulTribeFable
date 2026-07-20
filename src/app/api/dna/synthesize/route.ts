import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dnaAnswers, dnaVectors, dnaSummaries, profiles, users } from "@/lib/db/schema";
import { apiHandler, ok, ApiError } from "@/lib/api/handler";
import { buildVectors, VECTOR_SOURCE_VERSION, type AnswerMap } from "@/lib/dna/vectors";
import { getAIProvider } from "@/lib/ai";

/**
 * POST /api/dna/synthesize
 * Turns raw answers into (a) normalized matching vectors and (b) a warm,
 * editable "Friendship DNA" summary. Marks onboarding complete.
 *
 * Rate-limited under the `ai` scope — this is the AI-provider boundary,
 * so it keeps the same budget whether the provider is the template engine
 * or a real LLM later (PRD §13).
 */
export const POST = apiHandler({ scope: "ai" }, async ({ session }) => {
  const userId = session.user.id;

  const rows = await db.select().from(dnaAnswers).where(eq(dnaAnswers.userId, userId));
  if (rows.length < 8) {
    throw new ApiError(
      400,
      "A few more answers are needed before we can sketch your Friendship DNA."
    );
  }

  const answers: AnswerMap = {};
  for (const row of rows) answers[row.questionId] = row.answer as AnswerMap[string];

  const now = Date.now();

  // 1. Rebuild vectors (idempotent: delete + insert).
  const vectors = buildVectors(answers);
  await db.delete(dnaVectors).where(eq(dnaVectors.userId, userId));
  for (const v of vectors) {
    await db.insert(dnaVectors).values({
      userId,
      dimension: v.dimension,
      values: v.values,
      confidence: v.confidence,
      sourceVersion: VECTOR_SOURCE_VERSION,
      updatedAt: now,
    });
  }

  // 2. Generate the reveal summary through the AI provider abstraction.
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const summary = getAIProvider().generateDnaSummary(answers, profile?.displayName ?? "You");

  const existing = await db
    .select({ userId: dnaSummaries.userId })
    .from(dnaSummaries)
    .where(eq(dnaSummaries.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(dnaSummaries)
      .set({
        headline: summary.headline,
        sections: summary.sections,
        modelVersion: summary.modelVersion,
        updatedAt: now,
      })
      .where(eq(dnaSummaries.userId, userId));
  } else {
    await db.insert(dnaSummaries).values({
      userId,
      headline: summary.headline,
      sections: summary.sections,
      modelVersion: summary.modelVersion,
      updatedAt: now,
    });
  }

  // 3. Sync profile fields captured during onboarding.
  if (profile) {
    const bio = typeof answers.bio === "string" ? answers.bio : profile.bio;
    const feels =
      typeof answers.friendship_feels_like === "string"
        ? answers.friendship_feels_like
        : profile.friendshipFeelsLike;
    const languages = Array.isArray(answers.languages)
      ? (answers.languages as string[])
      : profile.languages;
    const neighborhood =
      typeof answers.neighborhood === "string" ? answers.neighborhood : profile.neighborhood;
    const lifeSeason =
      typeof answers.life_season === "string" ? answers.life_season : profile.lifeSeason;
    const intent = typeof answers.intent === "string" ? answers.intent : profile.intent;
    await db
      .update(profiles)
      .set({ bio, friendshipFeelsLike: feels, languages, neighborhood, lifeSeason, intent })
      .where(eq(profiles.userId, userId));
  }

  await db
    .update(users)
    .set({ onboardingComplete: true, lastActiveAt: now })
    .where(eq(users.id, userId));

  return ok({ summary, vectorCount: vectors.length, onboardingComplete: true });
});
