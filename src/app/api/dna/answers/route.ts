import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dnaAnswers, users } from "@/lib/db/schema";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { dnaAnswersSchema } from "@/lib/validation/schemas";
import { getQuestion, TOTAL_DNA_STEPS } from "@/lib/dna/questions";
import { sanitizeText, sanitizeMultiline } from "@/lib/security/sanitize";

/**
 * GET /api/dna/answers — all saved answers for the viewer (resume onboarding).
 * POST /api/dna/answers — autosave a step's answers; advances onboardingStep.
 *
 * Sensitive answers (privacyLevel === "sensitive") are stored but NEVER
 * surfaced through any public serializer — only their derived vectors are
 * used, per PRD §11.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const rows = await db
    .select()
    .from(dnaAnswers)
    .where(eq(dnaAnswers.userId, session.user.id));
  const answers: Record<string, unknown> = {};
  for (const row of rows) answers[row.questionId] = row.answer;
  return ok({
    answers,
    onboardingStep: session.user.onboardingStep,
    totalSteps: TOTAL_DNA_STEPS,
  });
});

export const POST = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, dnaAnswersSchema);
  const now = Date.now();

  for (const [questionId, rawValue] of Object.entries(body.answers)) {
    const question = getQuestion(questionId);
    if (!question) continue; // ignore unknown ids — never trust client keys

    // Sanitize free-text; other answer shapes are structurally validated.
    let value: unknown = rawValue;
    if (question.type === "text" && typeof rawValue === "string") {
      value = sanitizeMultiline(rawValue).slice(0, 600);
    } else if (Array.isArray(rawValue)) {
      value = rawValue.slice(0, 12).map((v) => sanitizeText(String(v)).slice(0, 60));
    }

    const existing = await db
      .select({ questionId: dnaAnswers.questionId })
      .from(dnaAnswers)
      .where(
        and(eq(dnaAnswers.userId, session.user.id), eq(dnaAnswers.questionId, questionId))
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(dnaAnswers)
        .set({ answer: value, updatedAt: now })
        .where(
          and(
            eq(dnaAnswers.userId, session.user.id),
            eq(dnaAnswers.questionId, questionId)
          )
        );
    } else {
      await db.insert(dnaAnswers).values({
        userId: session.user.id,
        questionId,
        answer: value,
        privacyLevel: question.privacyLevel,
        updatedAt: now,
      });
    }
  }

  // Advance the resume pointer, never backwards.
  const nextStep = Math.max(session.user.onboardingStep, body.step);
  await db
    .update(users)
    .set({ onboardingStep: nextStep, lastActiveAt: now })
    .where(eq(users.id, session.user.id));

  return ok({ saved: true, onboardingStep: nextStep });
});
