import type { ComponentScore, FitBand, MatchResult } from "./types";
import { RULESET_VERSION } from "./types";
import { getAIProvider } from "@/lib/ai";

/**
 * Deterministic compatibility scoring (PRD §6).
 *
 * The engine is intentionally inspectable: fixed weights, per-component
 * evidence levels, and qualitative bands instead of percentages. The LLM
 * layer only *translates* these structured results into warm copy — it never
 * decides who matches whom.
 */

export type VectorMap = Record<string, { values: Record<string, number>; confidence: number }>;

export interface ScoringSubject {
  userId: string;
  displayName: string;
  vectors: VectorMap;
  lifeSeason: string;
  neighborhoodKey: string;
  interestsShared?: string[];
}

/** PRD §6 weights. Behavioral starts small and grows with real-world signals. */
const WEIGHTS = {
  values: 0.2,
  communication: 0.18,
  rhythm: 0.16,
  emotional: 0.16,
  activity: 0.12,
  lifestyle: 0.1,
  complementarity: 0.05,
  behavioral: 0.03,
} as const;

const LABELS: Record<keyof typeof WEIGHTS, string> = {
  values: "Values & friendship intent",
  communication: "Communication compatibility",
  rhythm: "Social rhythm",
  emotional: "Emotional compatibility",
  activity: "Outing & activity fit",
  lifestyle: "Lifestyle practicality",
  complementarity: "Useful differences",
  behavioral: "Learning from real outings",
};

const similarity = (a: number, b: number) => 1 - Math.abs(a - b);

function vec(subject: ScoringSubject, dim: string) {
  return subject.vectors[dim] ?? { values: {}, confidence: 0 };
}

function avgSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  keys: string[]
): number {
  if (keys.length === 0) return 0.5;
  let total = 0;
  for (const k of keys) total += similarity(a[k] ?? 0.5, b[k] ?? 0.5);
  return total / keys.length;
}

function jaccard(a: Record<string, number>, b: Record<string, number>): number {
  const aKeys = new Set(Object.keys(a).filter((k) => a[k] > 0));
  const bKeys = new Set(Object.keys(b).filter((k) => b[k] > 0));
  if (aKeys.size === 0 && bKeys.size === 0) return 0.5;
  let inter = 0;
  aKeys.forEach((k) => bKeys.has(k) && inter++);
  const union = new Set([...aKeys, ...bKeys]).size;
  return union === 0 ? 0.5 : inter / union;
}

function evidence(confA: number, confB: number): ComponentScore["evidence"] {
  const c = Math.min(confA, confB);
  return c >= 0.66 ? "strong" : c >= 0.33 ? "partial" : "weak";
}

export interface BehavioralSignals {
  /** -0.2..+0.2 adjustment learned from reflections; 0 when unknown. */
  affinity: number;
  hasSignals: boolean;
}

export function scoreComponents(
  viewer: ScoringSubject,
  candidate: ScoringSubject,
  behavioral: BehavioralSignals = { affinity: 0, hasSignals: false }
): ComponentScore[] {
  const components: ComponentScore[] = [];

  // Values & intent (20%) — shared priorities without forcing sameness.
  {
    const a = vec(viewer, "values");
    const b = vec(candidate, "values");
    const wants = avgSimilarity(a.values, b.values, [
      "depth",
      "activity",
      "consistency",
      "calm",
      "creativity",
    ]);
    const intent = avgSimilarity(a.values, b.values, ["intent_close", "intent_activity"]);
    const seasonBonus = viewer.lifeSeason && viewer.lifeSeason === candidate.lifeSeason ? 0.1 : 0;
    components.push({
      key: "values",
      label: LABELS.values,
      weight: WEIGHTS.values,
      score: Math.min(1, wants * 0.55 + intent * 0.35 + seasonBonus),
      evidence: evidence(a.confidence, b.confidence),
    });
  }

  // Communication (18%)
  {
    const a = vec(viewer, "communication");
    const b = vec(candidate, "communication");
    components.push({
      key: "communication",
      label: LABELS.communication,
      weight: WEIGHTS.communication,
      score: avgSimilarity(a.values, b.values, ["cadence", "depth", "conflict_directness", "directness"]),
      evidence: evidence(a.confidence, b.confidence),
    });
  }

  // Social rhythm (16%) — availability overlap plus pace similarity.
  {
    const a = vec(viewer, "rhythm");
    const b = vec(candidate, "rhythm");
    const windows = ["weekday_day", "weekday_evening", "weekend_day", "weekend_evening"];
    const overlap = windows.some((w) => (a.values[w] ?? 0) > 0 && (b.values[w] ?? 0) > 0) ? 1 : 0.2;
    const pace = avgSimilarity(a.values, b.values, ["planning", "frequency"]);
    components.push({
      key: "rhythm",
      label: LABELS.rhythm,
      weight: WEIGHTS.rhythm,
      score: overlap * 0.5 + pace * 0.5,
      evidence: evidence(a.confidence, b.confidence),
    });
  }

  // Emotional (16%) — optional data only; weak evidence stays neutral.
  {
    const a = vec(viewer, "emotional");
    const b = vec(candidate, "emotional");
    const ev = evidence(a.confidence, b.confidence);
    const pace = similarity(a.values["vulnerability_pace"] ?? 0.5, b.values["vulnerability_pace"] ?? 0.5);
    const reassurance = similarity(a.values["reassurance"] ?? 0.5, b.values["reassurance"] ?? 0.5);
    // Complementary support styles score well: a venter + a listener works.
    const supportFit =
      (a.values["support_listen"] ?? 0) > 0 || (b.values["support_listen"] ?? 0) > 0 ? 0.75 : 0.55;
    components.push({
      key: "emotional",
      label: LABELS.emotional,
      weight: WEIGHTS.emotional,
      score: ev === "weak" ? 0.5 : pace * 0.45 + reassurance * 0.3 + supportFit * 0.25,
      evidence: ev,
    });
  }

  // Activity fit (12%) — current desire, via interest tags.
  {
    const a = vec(viewer, "interests");
    const b = vec(candidate, "interests");
    components.push({
      key: "activity",
      label: LABELS.activity,
      weight: WEIGHTS.activity,
      score: jaccard(a.values, b.values) * 0.85 + 0.15,
      evidence: evidence(a.confidence, b.confidence),
    });
  }

  // Lifestyle practicality (10%)
  {
    const a = vec(viewer, "lifestyle");
    const b = vec(candidate, "lifestyle");
    const budget = similarity(a.values["budget"] ?? 0.34, b.values["budget"] ?? 0.34);
    const proximity = viewer.neighborhoodKey === candidate.neighborhoodKey ? 1 : 0.55;
    const alcohol = similarity(a.values["alcohol_free"] ?? 0, b.values["alcohol_free"] ?? 0);
    components.push({
      key: "lifestyle",
      label: LABELS.lifestyle,
      weight: WEIGHTS.lifestyle,
      score: budget * 0.4 + proximity * 0.4 + alcohol * 0.2,
      evidence: evidence(a.confidence, b.confidence),
    });
  }

  // Complementarity bonus (5%) — useful differences without harsh mismatch.
  {
    const va = vec(viewer, "friendship_style").values;
    const vb = vec(candidate, "friendship_style").values;
    const ca = vec(viewer, "communication").values;
    const cb = vec(candidate, "communication").values;
    const initiationGap = Math.abs((va["initiation"] ?? 0.5) - (vb["initiation"] ?? 0.5));
    const depthBothOk = Math.min(ca["depth"] ?? 0.5, cb["depth"] ?? 0.5) > 0.4;
    // A moderate initiation gap with shared depth = one starts, one deepens.
    const useful = initiationGap > 0.2 && initiationGap < 0.6 && depthBothOk ? 0.9 : 0.45;
    components.push({
      key: "complementarity",
      label: LABELS.complementarity,
      weight: WEIGHTS.complementarity,
      score: useful,
      evidence: "partial",
    });
  }

  // Behavioral learning (3% initially)
  components.push({
    key: "behavioral",
    label: LABELS.behavioral,
    weight: WEIGHTS.behavioral,
    score: 0.5 + behavioral.affinity,
    evidence: behavioral.hasSignals ? "partial" : "weak",
  });

  return components;
}

export function bandFor(score: number): FitBand {
  if (score >= 0.8) return "kindred";
  if (score >= 0.68) return "strong";
  if (score >= 0.56) return "promising";
  return "worth_exploring";
}

export function scoreMatch(
  viewer: ScoringSubject,
  candidate: ScoringSubject,
  behavioral?: BehavioralSignals
): MatchResult {
  const components = scoreComponents(viewer, candidate, behavioral);
  const score = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const weakCount = components.filter((c) => c.evidence === "weak").length;
  const limitedEvidence = weakCount >= 3;
  // Weak evidence caps the band at "promising" — never invent depth (PRD §15).
  let band = bandFor(score);
  if (limitedEvidence && (band === "kindred" || band === "strong")) band = "promising";

  const explanation = getAIProvider().explainMatch({
    viewer,
    candidate,
    components,
    band,
    limitedEvidence,
  });

  return { candidateId: candidate.userId, score, band, components, explanation };
}

export { RULESET_VERSION };
