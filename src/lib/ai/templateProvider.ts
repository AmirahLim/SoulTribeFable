import type {
  AIProvider,
  DnaSummaryResult,
  ExplainMatchInput,
  OutingWordingInput,
  OutingWordingResult,
} from "./provider";
import type { MatchExplanation } from "@/lib/matching/types";
import type { AnswerMap } from "@/lib/dna/vectors";

/**
 * Deterministic "AI" — rule-based warm copy generated from structured data.
 *
 * Voice rules (PRD §5 critical rule + §16 copy direction):
 *  - Personality inference is never stated as objective truth.
 *    Always "You seem to…", "You tend to…", "This may fit because…".
 *  - Warm, specific and non-judgmental; no absolute claims.
 */

const MODEL_VERSION = "template-1.0.0";

const s = (v: unknown): string => (typeof v === "string" ? v : "");
const n = (v: unknown): number => (typeof v === "number" ? v : 50);
const a = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

const FORMAT_LABELS: Record<string, string> = {
  coffee: "coffee and conversation",
  walks: "walks in nature",
  food: "food adventures",
  books: "books and ideas",
  art: "art and museums",
  making: "making things with your hands",
  movement: "movement and sport",
  music: "live music",
  games: "board games",
  photography: "photography",
  volunteering: "volunteering",
  markets: "wandering markets and neighborhoods",
};

const SEASON_COPY: Record<string, string> = {
  new_city: "you're building a life in a new city, which takes real courage",
  rebuilding: "you're in a season of rebuilding — a thoughtful time to choose people well",
  exploring: "life feels stable and you're ready to add richness to it",
  career_intense: "work is intense right now, so the time you give people is deliberate",
  parenting: "friendship has to fit around family life, which calls for easy, flexible plans",
};

export class TemplateAIProvider implements AIProvider {
  readonly name = "template";

  generateDnaSummary(answers: AnswerMap, displayName: string): DnaSummaryResult {
    const sections: DnaSummaryResult["sections"] = [];
    const first = displayName.split(" ")[0] || "you";

    // Headline from intent + depth preference.
    const depth = s(answers["scenario_depth"]);
    const intent = s(answers["intent"]);
    const headline =
      depth === "depth_deep"
        ? "A depth-first friend who values the real conversation"
        : depth === "depth_light"
          ? "An easygoing companion who keeps things warm and light"
          : intent === "activity_partners"
            ? "A doer who connects best side-by-side"
            : "A thoughtful connector who lets closeness grow naturally";

    // Life season.
    const season = s(answers["life_season"]);
    if (season && SEASON_COPY[season]) {
      sections.push(sec("season", "life_season", `It sounds like ${SEASON_COPY[season]}.`));
    }

    // Personality.
    const directness = n(answers["directness"]);
    const curiosity = n(answers["curiosity"]);
    sections.push(
      sec(
        "personality",
        "personality",
        [
          directness > 65
            ? "You seem to say what you mean — people likely always know where they stand with you."
            : directness < 35
              ? "You seem to choose words carefully, favoring kindness in how things land."
              : "You seem to balance honesty with tact, adjusting to what the moment needs.",
          curiosity > 65
            ? "New ideas and unfamiliar corners of the city appear to genuinely energize you."
            : curiosity < 35
              ? "You appear to find comfort in familiar favorites — depth over novelty."
              : undefined,
        ]
          .filter(Boolean)
          .join(" ")
      )
    );

    // Communication.
    const reply = s(answers["scenario_reply"]);
    const conflict = s(answers["scenario_conflict"]);
    sections.push(
      sec(
        "communication",
        "communication",
        [
          reply === "reply_fast"
            ? "You tend to reply quickly, even if briefly — presence seems to matter to you."
            : reply === "reply_later_long"
              ? "You seem to prefer replying properly over replying instantly. Friends who don't read silence as distance will suit you."
              : "Your message rhythm appears to vary with your week — flexibility on both sides helps.",
          conflict === "conflict_direct"
            ? "When something bothers you, you seem to name it plainly, which keeps small things small."
            : conflict === "conflict_gentle"
              ? "You seem to raise friction gently, waiting for the right moment."
              : conflict === "conflict_internal"
                ? "You appear to process friction internally first, watching patterns before speaking."
                : undefined,
        ]
          .filter(Boolean)
          .join(" ")
      )
    );

    // Rhythm.
    const planning = n(answers["planning_style"]);
    const freq = n(answers["social_frequency"]);
    sections.push(
      sec(
        "rhythm",
        "rhythm",
        `${
          planning > 65
            ? "Spontaneous, same-day plans seem to suit you best"
            : planning < 35
              ? "You seem to like plans made a few days ahead, with time to look forward to them"
              : "You appear comfortable with both planned and spontaneous time"
        }, and ${
          freq > 65
            ? "you'd ideally see friends several times a week."
            : freq < 35
              ? "a couple of quality hangouts a month feels right to you."
              : "a steady weekly-ish rhythm feels about right."
        }`
      )
    );

    // Emotional (only if consented data exists).
    const support = s(answers["support_style"]);
    if (support || answers["vulnerability_pace"] !== undefined) {
      const pace = n(answers["vulnerability_pace"]);
      sections.push(
        sec(
          "emotional",
          "emotional",
          [
            support === "support_listen"
              ? "When someone you care about struggles, your instinct seems to be listening first."
              : support === "support_solve"
                ? "You seem to show care practically — ideas, plans, next steps."
                : support === "support_distract"
                  ? "You seem to care by lifting the mood and offering perspective."
                  : undefined,
            answers["vulnerability_pace"] !== undefined
              ? pace > 60
                ? "You appear to open up early when things feel safe, which can fast-track closeness."
                : pace < 40
                  ? "You seem to open up gradually — trust, for you, appears to be earned in layers."
                  : "You seem to pace openness naturally, matching the other person."
              : undefined,
          ]
            .filter(Boolean)
            .join(" ")
        )
      );
    }

    // Interests.
    const formats = a(answers["formats"]);
    if (formats.length > 0) {
      const named = formats.slice(0, 3).map((f) => FORMAT_LABELS[f] ?? f);
      sections.push(
        sec(
          "interests",
          "interests",
          `Right now, ${first === "you" ? "you're" : "you're"} drawn to ${listJoin(named)} — so that's where we'll start.`
        )
      );
    }

    return { headline, sections, modelVersion: MODEL_VERSION };
  }

  explainMatch(input: ExplainMatchInput): MatchExplanation {
    const { viewer, candidate, components, band, limitedEvidence } = input;
    const byKey = Object.fromEntries(components.map((c) => [c.key, c]));
    const name = candidate.displayName.split(" ")[0];

    const strong = components
      .filter((c) => c.score >= 0.66 && c.evidence !== "weak" && c.key !== "behavioral")
      .sort((x, y) => y.score * y.weight - x.score * x.weight);

    // Headline.
    const headline = limitedEvidence
      ? `Worth exploring — early signals look kind`
      : strong[0]?.key === "communication"
        ? `A conversation that should flow easily`
        : strong[0]?.key === "rhythm"
          ? `Your weeks fit together naturally`
          : strong[0]?.key === "values"
            ? `You're looking for the same kind of friendship`
            : strong[0]?.key === "activity"
              ? `You'd likely choose the same Saturday`
              : `A calm, curious match for low-pressure plans`;

    // Why it may work — at least two specific reasons (PRD §9).
    const why: string[] = [];
    const vComm = viewer.vectors["communication"]?.values ?? {};
    const cComm = candidate.vectors["communication"]?.values ?? {};
    const vRhythm = viewer.vectors["rhythm"]?.values ?? {};
    const cRhythm = candidate.vectors["rhythm"]?.values ?? {};

    if ((byKey["values"]?.score ?? 0) >= 0.6 && viewer.lifeSeason === candidate.lifeSeason) {
      why.push(`You're both in a similar life season, which tends to mean matching energy and patience.`);
    }
    if ((byKey["communication"]?.score ?? 0) >= 0.6) {
      const bothDeep = (vComm["depth"] ?? 0.5) > 0.6 && (cComm["depth"] ?? 0.5) > 0.6;
      why.push(
        bothDeep
          ? `You both seem to enjoy conversations that go somewhere real, not just small talk.`
          : `Your conversation styles look compatible — similar pace, similar directness.`
      );
    }
    if ((byKey["rhythm"]?.score ?? 0) >= 0.6) {
      const bothPlanned = (vRhythm["planning"] ?? 0.5) < 0.45 && (cRhythm["planning"] ?? 0.5) < 0.45;
      why.push(
        bothPlanned
          ? `You both seem to prefer plans made ahead of time — no last-minute scramble.`
          : `Your free windows overlap, so plans should actually happen.`
      );
    }
    if ((byKey["activity"]?.score ?? 0) >= 0.55 && (viewer.interestsShared?.length ?? 0) > 0) {
      const shared = viewer.interestsShared!.slice(0, 2).map((f) => FORMAT_LABELS[f] ?? f);
      why.push(`You're both drawn to ${listJoin(shared)} right now.`);
    }
    if ((byKey["lifestyle"]?.score ?? 0) >= 0.7) {
      why.push(`Practical fit is easy here — similar budgets and the same side of the city.`);
    }
    while (why.length < 2) {
      why.push(
        limitedEvidence
          ? `There's not much data yet, but nothing suggests friction either — sometimes that's how the good ones start.`
          : `Your overall patterns sit closer than most pairs we compare.`
      );
    }

    // Useful complement.
    const vInit = viewer.vectors["friendship_style"]?.values["initiation"] ?? 0.5;
    const cInit = candidate.vectors["friendship_style"]?.values["initiation"] ?? 0.5;
    let usefulComplement: string | null = null;
    if (cInit - vInit > 0.2) {
      usefulComplement = `${name} seems more likely to initiate; you tend to deepen the conversation once it starts.`;
    } else if (vInit - cInit > 0.2) {
      usefulComplement = `You seem more likely to get plans moving; ${name} appears to bring steadiness once you're there.`;
    } else if ((byKey["complementarity"]?.score ?? 0) > 0.7) {
      usefulComplement = `Your differences look useful rather than frictional — enough overlap to relax, enough contrast to stay interesting.`;
    }

    // Potential friction — honest expectations (PRD §9), gently phrased.
    let potentialFriction: string | null = null;
    const cadenceGap = Math.abs((vComm["cadence"] ?? 0.5) - (cComm["cadence"] ?? 0.5));
    const planGap = Math.abs((vRhythm["planning"] ?? 0.5) - (cRhythm["planning"] ?? 0.5));
    if (cadenceGap > 0.4) {
      potentialFriction =
        (cComm["cadence"] ?? 0.5) < (vComm["cadence"] ?? 0.5)
          ? `${name} may reply less frequently than you prefer, so this could work best when plans are concrete.`
          : `${name} may text more often than you naturally would — worth knowing, not worth worrying about.`;
    } else if (planGap > 0.45) {
      potentialFriction = `One of you plans ahead while the other leans spontaneous — agreeing on plans a few days out may be the sweet spot.`;
    } else if ((byKey["rhythm"]?.score ?? 1) < 0.45) {
      potentialFriction = `Your schedules don't overlap much, so shared plans may need a little more intention.`;
    }

    // Best first outing.
    const shared = viewer.interestsShared ?? [];
    const bestFirstOuting =
      shared.length > 0
        ? firstOutingFor(shared[0])
        : `Try a 60–90 minute coffee at a quiet café — long enough to connect, short enough to stay easy.`;

    return {
      headline,
      whyItMayWork: why.slice(0, 3),
      usefulComplement,
      potentialFriction,
      bestFirstOuting,
      band,
      limitedEvidence,
      rulesetVersion: MODEL_VERSION,
    };
  }

  suggestOutingWording(input: OutingWordingInput): OutingWordingResult {
    const title = input.title.trim();
    let pitch = input.pitch.trim();
    if (pitch.length > 0 && !/[.!?]$/.test(pitch)) pitch += ".";
    // Add a warm, low-pressure closer if the pitch is short and hasn't got one.
    if (pitch.length > 0 && pitch.length < 120 && !/no pressure|come as you are|all welcome/i.test(pitch)) {
      pitch += " Come as you are — this is meant to be easy.";
    }
    return { title, pitch };
  }
}

function sec(id: string, dimension: string, text: string) {
  return { id, dimension, text, hidden: false, edited: false };
}

function listJoin(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function firstOutingFor(format: string): string {
  const map: Record<string, string> = {
    coffee: "Try a 60–90 minute coffee at a quiet café — easy to extend if it flows.",
    walks: "Try a slow morning walk somewhere green — side-by-side conversation is the easiest kind.",
    food: "Try a casual hawker crawl — sharing food is a shortcut to feeling like old friends.",
    books: "Try a bookstore browse followed by a coffee to compare finds.",
    art: "Try a weekend gallery visit — built-in conversation starters on every wall.",
    making: "Try a drop-in craft or pottery session — hands busy, conversation easy.",
    movement: "Try an easy activity session where nobody keeps score.",
    music: "Try a low-key live set at an early hour — music first, chat after.",
    games: "Try a two-hour board game café session — structure makes first meetings easy.",
    photography: "Try a golden-hour photo walk through an old neighborhood.",
    volunteering: "Try a short volunteering shift together — shared purpose bonds fast.",
    markets: "Try wandering a weekend market with no agenda beyond good finds.",
  };
  return map[format] ?? "Try a 60–90 minute coffee at a quiet café.";
}

export const MODEL_VERSION_TEMPLATE = MODEL_VERSION;
