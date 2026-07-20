import type { ComponentScore, FitBand, MatchExplanation } from "@/lib/matching/types";
import type { ScoringSubject } from "@/lib/matching/scoring";
import type { AnswerMap } from "@/lib/dna/vectors";

/**
 * AI service boundary (PRD §13).
 *
 * Allowed: synthesize user-approved Friendship DNA, translate structured
 * compatibility scores into warm explanations, suggest outing wording.
 * Not allowed: infer protected traits, make safety decisions, fabricate
 * certainty, or reveal another user's private answers.
 *
 * The app depends only on this interface. `TemplateAIProvider` is the
 * deterministic MVP implementation; an OpenAI-compatible provider can be
 * dropped in behind `getAIProvider()` without touching any UI or API code.
 * Deterministic fallback copy is a launch requirement either way (PRD §15:
 * "AI summary fails → use deterministic template; never block onboarding").
 */

export interface DnaSummarySection {
  id: string;
  dimension: string;
  text: string;
  hidden: boolean;
  edited: boolean;
}

export interface DnaSummaryResult {
  headline: string;
  sections: DnaSummarySection[];
  modelVersion: string;
}

export interface ExplainMatchInput {
  viewer: ScoringSubject;
  candidate: ScoringSubject;
  components: ComponentScore[];
  band: FitBand;
  limitedEvidence: boolean;
}

export interface OutingWordingInput {
  title: string;
  pitch: string;
  category: string;
}

export interface OutingWordingResult {
  title: string;
  pitch: string;
}

export interface AIProvider {
  readonly name: string;
  /** Synthesize a reviewable, fully editable Friendship DNA summary. */
  generateDnaSummary(answers: AnswerMap, displayName: string): DnaSummaryResult;
  /** Translate structured scores into a warm, honest explanation. */
  explainMatch(input: ExplainMatchInput): MatchExplanation;
  /** Gentle copy polish for outing pitches. */
  suggestOutingWording(input: OutingWordingInput): OutingWordingResult;
}
