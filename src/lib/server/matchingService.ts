import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dnaVectors,
  feedback,
  matchRecommendations,
  outingMembers,
  outings,
  profiles,
  users,
} from "@/lib/db/schema";
import {
  scoreMatch,
  type ScoringSubject,
  type VectorMap,
  type BehavioralSignals,
} from "@/lib/matching/scoring";
import { RULESET_VERSION, type MatchResult } from "@/lib/matching/types";
import { eligibleCandidateIds } from "@/lib/matching/eligibility";
import { newId } from "./ids";
import { weekKey } from "@/lib/utils";

/**
 * Matching service — assembles scoring subjects from the database, runs the
 * deterministic engine, and persists explainable recommendations (with the
 * ruleset version logged, per data-governance requirements).
 */

export async function loadSubject(userId: string): Promise<ScoringSubject | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return null;
  const vecRows = await db.select().from(dnaVectors).where(eq(dnaVectors.userId, userId));
  const vectors: VectorMap = {};
  for (const row of vecRows) {
    vectors[row.dimension] = { values: row.values, confidence: row.confidence };
  }
  return {
    userId,
    displayName: profile.displayName,
    vectors,
    lifeSeason: profile.lifeSeason,
    neighborhoodKey: profile.neighborhood,
  };
}

function sharedInterests(a: ScoringSubject, b: ScoringSubject): string[] {
  const av = a.vectors["interests"]?.values ?? {};
  const bv = b.vectors["interests"]?.values ?? {};
  return Object.keys(av)
    .filter((k) => av[k] > 0 && (bv[k] ?? 0) > 0)
    .map((k) => k.replace(/^fmt_/, ""));
}

/**
 * Behavioral signal: mild positive/negative affinity learned from the
 * viewer's past reflections about people who share the candidate's life
 * season. One poor-fit outing changes things modestly (PRD §9).
 */
async function behavioralSignal(viewerId: string, candidateId: string): Promise<BehavioralSignals> {
  const rows = await db
    .select()
    .from(feedback)
    .where(and(eq(feedback.authorId, viewerId), eq(feedback.subjectId, candidateId)));
  if (rows.length === 0) return { affinity: 0, hasSignals: false };
  let affinity = 0;
  for (const row of rows) {
    if (row.futureIntent === "would_meet_again") affinity += 0.15;
    else if (row.futureIntent === "not_a_fit") affinity -= 0.12;
  }
  return { affinity: Math.max(-0.2, Math.min(0.2, affinity)), hasSignals: true };
}

export async function computeMatch(
  viewer: ScoringSubject,
  candidate: ScoringSubject
): Promise<MatchResult> {
  const behavioral = await behavioralSignal(viewer.userId, candidate.userId);
  viewer.interestsShared = sharedInterests(viewer, candidate);
  return scoreMatch(viewer, candidate, behavioral);
}

/** Rank all eligible candidates for a viewer, best first. */
export async function rankCandidates(viewerId: string): Promise<MatchResult[]> {
  const viewer = await loadSubject(viewerId);
  if (!viewer) return [];
  const ids = await eligibleCandidateIds(viewerId);
  const results: MatchResult[] = [];
  for (const id of ids) {
    const candidate = await loadSubject(id);
    if (!candidate) continue;
    results.push(await computeMatch({ ...viewer }, candidate));
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Soul Drop: a small weekly curated set (PRD: 3–5, no infinite feed).
 * Recommendations are persisted per ISO week so the drop is stable for the
 * whole week and interactions (viewed/saved/dismissed) are remembered.
 */
export async function getOrCreateSoulDrop(viewerId: string) {
  const wk = weekKey();
  const existing = await db
    .select()
    .from(matchRecommendations)
    .where(
      and(eq(matchRecommendations.viewerId, viewerId), eq(matchRecommendations.weekKey, wk))
    );
  if (existing.length > 0) return existing;

  const ranked = (await rankCandidates(viewerId)).slice(0, 4);
  const now = Date.now();
  const rows = ranked.map((r) => ({
    id: newId("rec"),
    viewerId,
    candidateId: r.candidateId,
    scoreBand: r.band,
    score: r.score,
    reasonJson: r.explanation,
    rulesetVersion: RULESET_VERSION,
    status: "fresh" as const,
    weekKey: wk,
    generatedAt: now,
  }));
  if (rows.length > 0) await db.insert(matchRecommendations).values(rows);
  return rows;
}

/** Curated outing suggestions for the Soul Drop (up to 3 upcoming). */
export async function suggestOutings(viewerId: string, limit = 3) {
  const now = Date.now();
  const rows = await db
    .select()
    .from(outings)
    .where(and(eq(outings.status, "published")));
  const memberships = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.userId, viewerId));
  const memberOf = new Set(memberships.map((m) => m.outingId));
  return rows
    .filter((o) => o.startsAt > now && o.hostId !== viewerId && !memberOf.has(o.id))
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, limit);
}
