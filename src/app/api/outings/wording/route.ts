import { z } from "zod";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { getAIProvider } from "@/lib/ai";
import { sanitizeText, sanitizeMultiline } from "@/lib/security/sanitize";

const wordingSchema = z.object({
  title: z.string().trim().min(1).max(80),
  pitch: z.string().trim().min(1).max(600),
  category: z.string().trim().max(30),
});

/**
 * POST /api/outings/wording
 * AI-assisted wording help while pitching an outing (PRD §13). Runs through
 * the provider abstraction under the `ai` rate scope. Suggestions only —
 * the host always keeps final say.
 */
export const POST = apiHandler({ scope: "ai" }, async ({ req }) => {
  const body = await parseBody(req, wordingSchema);
  const suggestion = getAIProvider().suggestOutingWording({
    title: sanitizeText(body.title),
    pitch: sanitizeMultiline(body.pitch),
    category: sanitizeText(body.category),
  });
  return ok({ suggestion });
});
