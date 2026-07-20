import { RULESET_VERSION } from "@/lib/matching/types";

/**
 * Translates raw Friendship DNA answers into normalized dimension vectors —
 * the structured data layer behind matching (PRD §5).
 *
 * Every attribute is normalized to [0, 1]. Confidence reflects how much of a
 * dimension the user actually answered, so the scorer can distinguish
 * "similar" from "we don't know yet" (PRD §15: weak evidence must not
 * masquerade as depth).
 */

export type AnswerMap = Record<string, unknown>;

export interface BuiltVector {
  dimension: string;
  values: Record<string, number>;
  confidence: number;
}

const num = (v: unknown, fallback = 50): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) / 100 : fallback / 100;

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function buildVectors(answers: AnswerMap): BuiltVector[] {
  const vectors: BuiltVector[] = [];

  // Personality -------------------------------------------------------------
  {
    const has = ["directness", "curiosity", "planning_style"].filter((k) => answers[k] !== undefined);
    vectors.push({
      dimension: "personality",
      values: {
        directness: num(answers["directness"]),
        curiosity: num(answers["curiosity"]),
        spontaneity: num(answers["planning_style"]),
      },
      confidence: has.length / 3,
    });
  }

  // Values ------------------------------------------------------------------
  {
    const wants = arr(answers["wanting_more"]);
    const intent = str(answers["intent"]);
    vectors.push({
      dimension: "values",
      values: {
        depth: wants.includes("deep_conversation") ? 1 : 0,
        activity: wants.includes("shared_activities") ? 1 : 0,
        spontaneity: wants.includes("spontaneity") ? 1 : 0,
        consistency: wants.includes("consistency") ? 1 : 0,
        creativity: wants.includes("creativity") ? 1 : 0,
        calm: wants.includes("quiet_company") ? 1 : 0,
        intent_close: intent === "close_friends" || intent === "fresh_start" ? 1 : 0,
        intent_activity: intent === "activity_partners" || intent === "local_circle" ? 1 : 0,
      },
      confidence: (wants.length > 0 ? 0.6 : 0) + (intent ? 0.4 : 0),
    });
  }

  // Communication -------------------------------------------------------------
  {
    const reply = str(answers["scenario_reply"]);
    const depth = str(answers["scenario_depth"]);
    const conflict = str(answers["scenario_conflict"]);
    const answered = [reply, depth, conflict].filter(Boolean).length;
    vectors.push({
      dimension: "communication",
      values: {
        cadence: reply === "reply_fast" ? 1 : reply === "reply_later_long" ? 0.35 : 0.6,
        depth: depth === "depth_deep" ? 1 : depth === "depth_mixed" ? 0.55 : 0.15,
        conflict_directness:
          conflict === "conflict_direct" ? 1 : conflict === "conflict_gentle" ? 0.55 : 0.15,
        directness: num(answers["directness"]),
      },
      confidence: answered / 3,
    });
  }

  // Social rhythm ---------------------------------------------------------------
  {
    const avail = arr(answers["availability"]);
    vectors.push({
      dimension: "rhythm",
      values: {
        weekday_day: avail.includes("weekday_day") ? 1 : 0,
        weekday_evening: avail.includes("weekday_evening") ? 1 : 0,
        weekend_day: avail.includes("weekend_day") ? 1 : 0,
        weekend_evening: avail.includes("weekend_evening") ? 1 : 0,
        planning: num(answers["planning_style"]),
        frequency: num(answers["social_frequency"]),
      },
      confidence: avail.length > 0 ? 1 : 0.3,
    });
  }

  // Emotional style (optional, consent-based) ------------------------------------
  {
    const support = str(answers["support_style"]);
    const answered =
      (answers["vulnerability_pace"] !== undefined ? 1 : 0) +
      (support ? 1 : 0) +
      (answers["reassurance"] !== undefined ? 1 : 0);
    vectors.push({
      dimension: "emotional",
      values: {
        vulnerability_pace: num(answers["vulnerability_pace"]),
        reassurance: num(answers["reassurance"]),
        support_listen: support === "support_listen" ? 1 : 0,
        support_solve: support === "support_solve" ? 1 : 0,
        support_distract: support === "support_distract" ? 1 : 0,
      },
      confidence: answered / 3,
    });
  }

  // Friendship style ----------------------------------------------------------
  {
    const size = str(answers["group_size"]);
    vectors.push({
      dimension: "friendship_style",
      values: {
        one_on_one: size === "one_on_one" ? 1 : size === "either" ? 0.5 : 0.15,
        initiation:
          str(answers["scenario_reply"]) === "reply_fast" ? 0.8 : 0.4,
        consistency: num(answers["social_frequency"]),
      },
      confidence: size ? 1 : 0.3,
    });
  }

  // Lifestyle ------------------------------------------------------------------
  {
    const budgetOrder = ["free", "under_20", "20_50", "over_50"];
    const budget = budgetOrder.indexOf(str(answers["budget"]));
    const comfort = arr(answers["comfort"]);
    vectors.push({
      dimension: "lifestyle",
      values: {
        budget: budget >= 0 ? budget / 3 : 0.34,
        alcohol_free: comfort.includes("alcohol_free") ? 1 : 0,
        accessibility: comfort.includes("wheelchair") ? 1 : 0,
        quiet: comfort.includes("quiet") ? 1 : 0,
        outdoor: comfort.includes("outdoor") ? 1 : 0,
      },
      confidence: budget >= 0 ? 1 : 0.4,
    });
  }

  // Interests -----------------------------------------------------------------
  {
    const formats = arr(answers["formats"]);
    const values: Record<string, number> = {};
    for (const f of formats) values[`fmt_${f}`] = 1;
    vectors.push({
      dimension: "interests",
      values,
      confidence: formats.length > 0 ? 1 : 0,
    });
  }

  // Life season (categorical one-hot) -------------------------------------------
  {
    const season = str(answers["life_season"]);
    vectors.push({
      dimension: "life_season",
      values: season ? { [`season_${season}`]: 1 } : {},
      confidence: season ? 1 : 0,
    });
  }

  // Boundaries (private; used as hard filters) -----------------------------------
  {
    const bounds = arr(answers["boundaries"]);
    const values: Record<string, number> = {};
    for (const b of bounds) values[b] = 1;
    vectors.push({ dimension: "boundaries", values, confidence: 1 });
  }

  return vectors;
}

export const VECTOR_SOURCE_VERSION = RULESET_VERSION;
