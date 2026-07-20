import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { signInSchema } from "@/lib/validation/schemas";
import { createSession } from "@/lib/auth/session";

/**
 * POST /api/auth/signin
 * Verifies credentials and issues an httpOnly session cookie.
 * Uses a constant "invalid credentials" message to avoid account enumeration.
 */
export const POST = apiHandler(
  { scope: "auth", public: true },
  async ({ req }) => {
    const body = await parseBody(req, signInSchema);
    const email = body.email.toLowerCase().trim();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Always run bcrypt (against a dummy hash if needed) to keep timing uniform.
    const hash =
      user?.passwordHash ??
      "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpZz0sQxGf1yE2rWm3nJ0eGm1uW6i";
    const valid = await bcrypt.compare(body.password, hash);

    if (!user || !valid) {
      throw new ApiError(401, "That email and password don't match our records.");
    }
    if (user.status === "deactivated") {
      throw new ApiError(403, "This account is deactivated. Contact support to restore it.");
    }

    const { csrfToken } = await createSession(user.id);
    return ok({
      userId: user.id,
      csrfToken,
      onboardingComplete: user.onboardingComplete,
      onboardingStep: user.onboardingStep,
    });
  }
);
