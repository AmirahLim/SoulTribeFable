import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";

/**
 * GET /api/auth/me
 * Returns the viewer's account + profile + CSRF token. The client stores the
 * CSRF token in memory and echoes it on every mutating request.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  return ok({
    user: {
      id: session.user.id,
      email: session.user.email,
      status: session.user.status,
      onboardingStep: session.user.onboardingStep,
      onboardingComplete: session.user.onboardingComplete,
      isAdmin: session.user.isAdmin,
    },
    profile: profile ?? null,
    csrfToken: session.csrfToken,
  });
});
