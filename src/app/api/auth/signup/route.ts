import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, profiles } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { signUpSchema } from "@/lib/validation/schemas";
import { createSession } from "@/lib/auth/session";
import { newId } from "@/lib/server/ids";
import { sanitizeText } from "@/lib/security/sanitize";

/**
 * POST /api/auth/signup
 * Creates an account (18+ gated, community pledge required per PRD §6).
 * Rate-limited under the `auth` scope to slow credential stuffing.
 */
export const POST = apiHandler(
  { scope: "auth", public: true },
  async ({ req }) => {
    const body = await parseBody(req, signUpSchema);

    const email = body.email.toLowerCase().trim();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      // Neutral copy — do not reveal which part failed beyond "in use".
      throw new ApiError(409, "That email is already registered. Try signing in instead.");
    }

    const now = Date.now();
    const userId = newId("usr");
    const passwordHash = await bcrypt.hash(body.password, 12);

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      status: "active",
      birthDate: body.birthDate,
      city: "Singapore",
      onboardingStep: 0,
      onboardingComplete: false,
      isAdmin: false,
      createdAt: now,
      lastActiveAt: now,
    });

    // A shell profile so downstream screens always have something to render.
    await db.insert(profiles).values({
      userId,
      displayName: sanitizeText(body.displayName),
      pronouns: null,
      avatarSeed: userId,
      bio: "",
      friendshipFeelsLike: "",
      languages: ["English"],
      neighborhood: "",
      lifeSeason: "",
      visibility: "community",
      intent: "",
    });

    const { csrfToken } = await createSession(userId);
    return ok({ userId, csrfToken, onboardingComplete: false });
  }
);
