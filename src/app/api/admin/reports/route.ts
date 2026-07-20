import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { apiHandler, parseBody, ok, ApiError } from "@/lib/api/handler";
import { isSafeId } from "@/lib/security/sanitize";

/**
 * GET   /api/admin/reports — moderation queue (admins only).
 * PATCH /api/admin/reports — update a report's status; optionally restrict
 *        or reinstate the reported user (PRD §10 admin console, MVP-thin).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session }) => {
  if (!session.user.isAdmin) throw new ApiError(403, "Admins only.");
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
  return ok({ reports: rows });
});

const decisionSchema = z.object({
  reportId: z.string().max(64),
  status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
  restrictUserId: z.string().max(64).optional(),
  restore: z.boolean().optional(),
});

export const PATCH = apiHandler({ scope: "api" }, async ({ session, req }) => {
  if (!session.user.isAdmin) throw new ApiError(403, "Admins only.");
  const body = await parseBody(req, decisionSchema);
  if (!isSafeId(body.reportId)) throw new ApiError(404, "Report not found.");

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, body.reportId))
    .limit(1);
  if (!report) throw new ApiError(404, "Report not found.");

  await db.update(reports).set({ status: body.status }).where(eq(reports.id, body.reportId));

  if (body.restrictUserId && isSafeId(body.restrictUserId)) {
    await db
      .update(users)
      .set({ status: body.restore ? "active" : "restricted", lastActiveAt: Date.now() })
      .where(eq(users.id, body.restrictUserId));
  }

  return ok({ updated: true });
});
