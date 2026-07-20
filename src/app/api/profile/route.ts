import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { sanitizeText, sanitizeMultiline } from "@/lib/security/sanitize";

/**
 * GET   /api/profile — the viewer's own full profile.
 * PATCH /api/profile — update display fields and visibility. Visibility is
 * the user's control over discovery: community / matches_only / hidden.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!profile) throw new ApiError(404, "Profile not found.");
  return ok({ profile });
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, profileUpdateSchema);

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!profile) throw new ApiError(404, "Profile not found.");

  await db
    .update(profiles)
    .set({
      displayName:
        body.displayName !== undefined ? sanitizeText(body.displayName) : profile.displayName,
      pronouns: body.pronouns !== undefined ? sanitizeText(body.pronouns) : profile.pronouns,
      bio: body.bio !== undefined ? sanitizeMultiline(body.bio) : profile.bio,
      friendshipFeelsLike:
        body.friendshipFeelsLike !== undefined
          ? sanitizeMultiline(body.friendshipFeelsLike)
          : profile.friendshipFeelsLike,
      lifeSeason: body.lifeSeason !== undefined ? sanitizeText(body.lifeSeason) : profile.lifeSeason,
      visibility: body.visibility ?? profile.visibility,
      avatarSeed: body.avatarSeed !== undefined ? sanitizeText(body.avatarSeed) : profile.avatarSeed,
    })
    .where(eq(profiles.userId, session.user.id));

  const [updated] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  return ok({ profile: updated });
});
