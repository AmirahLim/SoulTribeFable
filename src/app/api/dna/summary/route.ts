import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dnaSummaries, dnaAnswers, profiles } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { summaryEditSchema } from "@/lib/validation/schemas";
import { sanitizeText, sanitizeMultiline } from "@/lib/security/sanitize";
import { getAIProvider } from "@/lib/ai";
import type { AnswerMap } from "@/lib/dna/vectors";

/**
 * GET   /api/dna/summary — the viewer's Friendship DNA summary.
 * PATCH /api/dna/summary — edit headline / edit or hide sections /
 *        regenerate from answers. Users stay in control of their own
 *        narrative (PRD §6); edits are marked so regeneration can respect them.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const [summary] = await db
    .select()
    .from(dnaSummaries)
    .where(eq(dnaSummaries.userId, session.user.id))
    .limit(1);
  if (!summary) throw new ApiError(404, "No Friendship DNA summary yet.");
  return ok({ summary });
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, summaryEditSchema);
  const userId = session.user.id;

  const [summary] = await db
    .select()
    .from(dnaSummaries)
    .where(eq(dnaSummaries.userId, userId))
    .limit(1);
  if (!summary) throw new ApiError(404, "No Friendship DNA summary yet.");

  const now = Date.now();

  if (body.regenerate) {
    const rows = await db.select().from(dnaAnswers).where(eq(dnaAnswers.userId, userId));
    const answers: AnswerMap = {};
    for (const row of rows) answers[row.questionId] = row.answer as AnswerMap[string];
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const fresh = getAIProvider().generateDnaSummary(answers, profile?.displayName ?? "You");

    // Respect sections the user hid previously.
    const hiddenIds = new Set(summary.sections.filter((s) => s.hidden).map((s) => s.id));
    const sections = fresh.sections.map((s) => ({ ...s, hidden: hiddenIds.has(s.id) }));

    await db
      .update(dnaSummaries)
      .set({
        headline: fresh.headline,
        sections,
        modelVersion: fresh.modelVersion,
        updatedAt: now,
      })
      .where(eq(dnaSummaries.userId, userId));
    return ok({ summary: { ...summary, headline: fresh.headline, sections } });
  }

  const headline =
    body.headline !== undefined ? sanitizeText(body.headline) : summary.headline;

  let sections = summary.sections;
  if (body.sections) {
    const incoming = new Map(body.sections.map((s) => [s.id, s]));
    sections = summary.sections.map((section) => {
      const patch = incoming.get(section.id);
      if (!patch) return section;
      const newText = sanitizeMultiline(patch.text).slice(0, 500);
      return {
        ...section,
        text: newText,
        hidden: patch.hidden,
        edited: section.edited || newText !== section.text,
      };
    });
  }

  await db
    .update(dnaSummaries)
    .set({ headline, sections, updatedAt: now })
    .where(eq(dnaSummaries.userId, userId));

  return ok({ summary: { ...summary, headline, sections } });
});
