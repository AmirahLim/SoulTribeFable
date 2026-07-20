import { desc, eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { apiHandler, parseBody, ok } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";

/**
 * GET   /api/notifications — latest 50 with unread count.
 * PATCH /api/notifications — mark one (id) or all read.
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.sentAt))
    .limit(50);

  const unread = rows.filter((n) => n.readAt === null).length;
  return ok({ notifications: rows, unreadCount: unread });
});

const markSchema = z.object({
  id: z.string().max(64).optional(), // omit to mark all read
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const body = await parseBody(req, markSchema);
  const now = Date.now();

  if (body.id) {
    if (!isSafeId(body.id)) return ok({ marked: 0 });
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.id, body.id), eq(notifications.userId, session.user.id))
      );
    return ok({ marked: 1 });
  }

  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)));
  return ok({ marked: "all" });
});
