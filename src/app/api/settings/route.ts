import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, profiles } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { settingsSchema } from "@/lib/validation/schemas";

/**
 * GET   /api/settings — the viewer's account settings.
 * PATCH /api/settings — update notification preferences (PRD §12: users can
 * mute non-essential notifications; safety notices always deliver).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!user || !profile) throw new ApiError(404, "Account not found.");

  return ok({
    email: user.email,
    notificationPrefs: user.notificationPrefs,
    visibility: profile.visibility,
    memberSince: user.createdAt,
  });
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, settingsSchema);

  if (body.notificationPrefs) {
    await db
      .update(users)
      .set({ notificationPrefs: body.notificationPrefs })
      .where(eq(users.id, session.user.id));
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return ok({ notificationPrefs: user!.notificationPrefs });
});
