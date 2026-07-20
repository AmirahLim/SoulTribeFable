/**
 * Matching layer types — shared by the scoring engine, the AI explanation
 * provider, API routes and the client.
 */

export const RULESET_VERSION = "rules-1.0.0";

/** Qualitative fit bands — the PRD explicitly avoids percentage display. */
export type FitBand = "kindred" | "strong" | "promising" | "worth_exploring";

export const FIT_BAND_LABELS: Record<FitBand, string> = {
  kindred: "Kindred match",
  strong: "Strong fit",
  promising: "Promising",
  worth_exploring: "Worth exploring",
};

/** Weighted components per PRD §6 "Illustrative compatibility score". */
export interface ComponentScore {
  key:
    | "values"
    | "communication"
    | "rhythm"
    | "emotional"
    | "activity"
    | "lifestyle"
    | "complementarity"
    | "behavioral";
  label: string;
  weight: number;
  /** 0..1 similarity/affinity for this component. */
  score: number;
  /** Whether both users supplied enough data for this component. */
  evidence: "strong" | "partial" | "weak";
}

/** Explanation framework per PRD §6 — every layer is optional except headline. */
export interface MatchExplanation {
  headline: string;
  whyItMayWork: string[];
  usefulComplement: string | null;
  potentialFriction: string | null;
  bestFirstOuting: string | null;
  band: FitBand;
  /** Weak-evidence matches must say so rather than invent depth (PRD §15). */
  limitedEvidence: boolean;
  rulesetVersion: string;
}

export interface MatchResult {
  candidateId: string;
  score: number; // 0..1 internal only — never shown as a percentage
  band: FitBand;
  components: ComponentScore[];
  explanation: MatchExplanation;
}

export interface EligibilityContext {
  viewerId: string;
  blockedPairs: Set<string>; // "a:b" normalized keys
  reportedUserIds: Set<string>;
}
