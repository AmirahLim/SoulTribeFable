import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, profiles } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";
import { destroySession } from "@/lib/auth/session";

/**
 * POST /api/account/deactivate
 * Pause the account (PRD §7 settings). Profile becomes hidden, the user
 * disappears from all discovery, and the session ends. Data is retained so
 * they can return — deletion-with-purge would be a support flow post-MVP.
 */
export const POST = apiHandler({ scope: "api" }, async ({ session }) => {
  const now = Date.now();
  await db
    .update(users)
    .set({ status: "deactivated", lastActiveAt: now })
    .where(eq(users.id, session.user.id));
  await db
    .update(profiles)
    .set({ visibility: "hidden" })
    .where(eq(profiles.userId, session.user.id));
  await destroySession();
  return ok({ deactivated: true });
});
