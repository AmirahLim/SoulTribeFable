import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blocks, users, profiles } from "@/lib/db/schema";

/**
 * Eligibility gates (PRD §6) — hard filters applied before any scoring.
 * Blocked relationships, deactivated/restricted accounts and hidden profiles
 * never reach the ranking stage in either direction.
 */

export async function getBlockedIdsFor(userId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
  const set = new Set<string>();
  for (const row of rows) {
    set.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return set;
}

export interface EligibleCandidate {
  userId: string;
}

/** Returns user ids that pass the hard gates for a given viewer. */
export async function eligibleCandidateIds(viewerId: string): Promise<string[]> {
  const blocked = await getBlockedIdsFor(viewerId);
  const rows = await db
    .select({ id: users.id, visibility: profiles.visibility, complete: users.onboardingComplete })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.status, "active")));

  return rows
    .filter(
      (r) =>
        r.id !== viewerId &&
        !blocked.has(r.id) &&
        r.complete &&
        r.visibility !== "hidden"
    )
    .map((r) => r.id);
}

/** Boundary-based outing exclusion: private boundaries silently filter. */
export function outingViolatesBoundaries(
  boundaryValues: Record<string, number>,
  outing: { category: string; startsAt: number; timezone: string; alcoholFree: boolean }
): boolean {
  if (boundaryValues["no_bars"] && !outing.alcoholFree && outing.category === "drinks") return true;
  if (boundaryValues["no_late"]) {
    const hourLocal = new Date(outing.startsAt).getUTCHours() + 8; // Asia/Singapore
    if (hourLocal % 24 >= 20) return true;
  }
  if (boundaryValues["no_intense_exercise"] && outing.category === "movement") return true;
  if (boundaryValues["no_networking"] && outing.category === "networking") return true;
  return false;
}
