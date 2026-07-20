import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outings, outingPreferences, dnaVectors } from "@/lib/db/schema";
import { apiHandler, ok } from "@/lib/api/handler";
import { getBlockedIdsFor, outingViolatesBoundaries } from "@/lib/matching/eligibility";
import { serializeOuting } from "@/lib/server/serializers";
import { OUTING_CATEGORIES, AREAS } from "@/lib/validation/schemas";

/**
 * GET /api/discover/outings?category=&area=&budget=&alcoholFree=&accessible=
 * Upcoming published outings, filtered server-side. Outings that clash with
 * the viewer's private hard boundaries are silently excluded, and blocked
 * users' outings never appear (PRD §8/§10).
 */
export const GET = apiHandler({ scope: "api" }, async ({ session, req }) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const area = url.searchParams.get("area");
  const budget = url.searchParams.get("budget");
  const alcoholFree = url.searchParams.get("alcoholFree") === "1";
  const accessible = url.searchParams.get("accessible") === "1";

  const now = Date.now();
  const rows = await db
    .select()
    .from(outings)
    .where(and(eq(outings.status, "published"), gt(outings.startsAt, now)));

  const blocked = await getBlockedIdsFor(session.user.id);

  // Viewer's private boundaries silently filter what they see.
  const [boundaryRow] = await db
    .select()
    .from(dnaVectors)
    .where(
      and(eq(dnaVectors.userId, session.user.id), eq(dnaVectors.dimension, "boundaries"))
    )
    .limit(1);
  const boundaries = boundaryRow?.values ?? {};

  const prefRows = await db.select().from(outingPreferences);
  const prefsByOuting = new Map(prefRows.map((p) => [p.outingId, p]));

  const filtered = [];
  for (const o of rows) {
    if (blocked.has(o.hostId)) continue;
    if (o.visibility === "invite_only" && o.hostId !== session.user.id) continue;
    if (category && OUTING_CATEGORIES.includes(category as never) && o.category !== category)
      continue;
    if (area && AREAS.includes(area as never) && o.area !== area) continue;

    const prefs = prefsByOuting.get(o.id);
    if (budget && prefs && prefs.budgetBand !== budget) continue;
    if (alcoholFree && prefs && !prefs.alcoholFree) continue;
    if (accessible && prefs && !prefs.wheelchairAccessible) continue;

    if (
      outingViolatesBoundaries(boundaries, {
        category: o.category,
        startsAt: o.startsAt,
        timezone: o.timezone,
        alcoholFree: prefs?.alcoholFree ?? false,
      })
    ) {
      continue;
    }
    filtered.push(o);
  }

  filtered.sort((a, b) => a.startsAt - b.startsAt);
  const serialized = await Promise.all(
    filtered.slice(0, 24).map((o) => serializeOuting(o, session.user.id))
  );
  return ok({ outings: serialized });
});
