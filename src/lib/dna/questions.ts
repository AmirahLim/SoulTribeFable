/**
 * Friendship DNA question bank.
 *
 * Onboarding is a conversation, not a clinical test (PRD §5): short
 * forced-choice scenarios, sliders and preference cards, grouped into
 * progressive steps. Every step supports skipping; sensitive layers carry
 * consent copy ("How this helps matching") and privacy labels.
 */

export type QuestionType =
  | "single"
  | "multi"
  | "slider"
  | "scenario"
  | "tags"
  | "text";

export interface DnaOption {
  value: string;
  label: string;
  description?: string;
}

export interface DnaQuestion {
  id: string;
  step: number;
  dimension: string;
  type: QuestionType;
  prompt: string;
  helper?: string;
  howThisHelps: string;
  options?: DnaOption[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  maxSelections?: number;
  optional: boolean;
  sensitive?: boolean;
  privacyLevel: "matching_only" | "visible" | "private";
  placeholder?: string;
  maxLength?: number;
}

export interface DnaStep {
  step: number;
  title: string;
  subtitle: string;
  sensitive?: boolean;
  consentCopy?: string;
}

export const DNA_STEPS: DnaStep[] = [
  {
    step: 1,
    title: "The basics",
    subtitle: "A little context so introductions feel local and relevant.",
  },
  {
    step: 2,
    title: "Your current season",
    subtitle: "Friendship needs change with life. Where are you right now?",
  },
  {
    step: 3,
    title: "Your social rhythm",
    subtitle: "When and how you actually like to spend time with people.",
  },
  {
    step: 4,
    title: "How you connect",
    subtitle: "A few small scenarios — answer with your honest instinct.",
  },
  {
    step: 5,
    title: "Emotional fit",
    subtitle: "Optional, and it stays between you and the matching engine.",
    sensitive: true,
    consentCopy:
      "This layer helps us match support styles and vulnerability pace. It is never shown on your profile and you can skip all of it.",
  },
  {
    step: 6,
    title: "Outings that suit you",
    subtitle: "Practical fit — so plans feel easy to say yes to.",
  },
  {
    step: 7,
    title: "In your own words",
    subtitle: "The part of your profile only you can write.",
  },
];

export const DNA_QUESTIONS: DnaQuestion[] = [
  // ---------------------------------------------------------- step 1: basics
  {
    id: "languages",
    step: 1,
    dimension: "lifestyle",
    type: "multi",
    prompt: "Which languages are you comfortable socializing in?",
    howThisHelps: "We only suggest outings held in languages you're at ease with.",
    options: [
      { value: "english", label: "English" },
      { value: "mandarin", label: "Mandarin" },
      { value: "malay", label: "Malay" },
      { value: "tamil", label: "Tamil" },
      { value: "cantonese", label: "Cantonese" },
      { value: "other", label: "Another language" },
    ],
    optional: false,
    privacyLevel: "visible",
  },
  {
    id: "intent",
    step: 1,
    dimension: "values",
    type: "single",
    prompt: "What are you hoping Soul Tribe helps you find?",
    howThisHelps: "Intent alignment is one of the strongest predictors of a good match.",
    options: [
      { value: "close_friends", label: "A few close friendships", description: "Depth over breadth" },
      { value: "activity_partners", label: "People for shared activities", description: "Company for the things I love" },
      { value: "local_circle", label: "A local circle", description: "Familiar faces in my neighborhood" },
      { value: "fresh_start", label: "A fresh start socially", description: "Rebuilding my social life" },
    ],
    optional: false,
    privacyLevel: "visible",
  },
  {
    id: "neighborhood",
    step: 1,
    dimension: "lifestyle",
    type: "single",
    prompt: "Which part of Singapore feels most 'yours'?",
    howThisHelps: "We keep suggestions within a realistic travel radius.",
    options: [
      { value: "central", label: "Central — Tiong Bahru, River Valley" },
      { value: "east", label: "East — Katong, Joo Chiat, Bedok" },
      { value: "west", label: "West — Holland V, Clementi, Jurong" },
      { value: "north", label: "North — Ang Mo Kio, Yishun" },
      { value: "northeast", label: "North-East — Serangoon, Punggol" },
    ],
    optional: false,
    privacyLevel: "visible",
  },
  // ------------------------------------------------------ step 2: life season
  {
    id: "life_season",
    step: 2,
    dimension: "life_season",
    type: "single",
    prompt: "Which of these feels closest to your current season?",
    howThisHelps: "People in compatible seasons tend to have matching energy and availability.",
    options: [
      { value: "new_city", label: "New to the city", description: "Building a life here from scratch" },
      { value: "rebuilding", label: "Rebuilding", description: "After a move, breakup or big change" },
      { value: "exploring", label: "Exploring", description: "Life is stable; I want more richness" },
      { value: "career_intense", label: "Career-intense", description: "Busy, but protecting time for people" },
      { value: "parenting", label: "Parenting", description: "Friendship has to fit family life" },
    ],
    optional: false,
    privacyLevel: "visible",
  },
  {
    id: "wanting_more",
    step: 2,
    dimension: "values",
    type: "multi",
    prompt: "What do you want more of right now?",
    maxSelections: 3,
    howThisHelps: "This shapes which outings and people we surface first.",
    options: [
      { value: "deep_conversation", label: "Deeper conversations" },
      { value: "shared_activities", label: "Shared activities" },
      { value: "spontaneity", label: "Spontaneity" },
      { value: "consistency", label: "Consistent, regular contact" },
      { value: "creativity", label: "Creative company" },
      { value: "quiet_company", label: "Quiet, low-key company" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  // ---------------------------------------------------- step 3: social rhythm
  {
    id: "availability",
    step: 3,
    dimension: "rhythm",
    type: "multi",
    prompt: "When do you usually have real energy for people?",
    howThisHelps: "Availability overlap is a hard requirement for outings to actually happen.",
    options: [
      { value: "weekday_day", label: "Weekday daytime" },
      { value: "weekday_evening", label: "Weekday evenings" },
      { value: "weekend_day", label: "Weekend daytime" },
      { value: "weekend_evening", label: "Weekend evenings" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "planning_style",
    step: 3,
    dimension: "rhythm",
    type: "slider",
    prompt: "How do you like plans to come together?",
    min: 0,
    max: 100,
    minLabel: "Planned days ahead",
    maxLabel: "Spontaneous, same-day",
    howThisHelps: "Matching planning styles removes a quiet source of friction.",
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "group_size",
    step: 3,
    dimension: "friendship_style",
    type: "single",
    prompt: "Your ideal hangout size?",
    howThisHelps: "We default your discovery toward formats you actually enjoy.",
    options: [
      { value: "one_on_one", label: "One-on-one", description: "Real conversation, no crowd" },
      { value: "small", label: "Small group (3–5)", description: "Cozy but social" },
      { value: "either", label: "Depends on my mood", description: "Both have their place" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "social_frequency",
    step: 3,
    dimension: "rhythm",
    type: "slider",
    prompt: "How often would you ideally see friends?",
    min: 0,
    max: 100,
    minLabel: "A couple of times a month",
    maxLabel: "Several times a week",
    howThisHelps: "Pace mismatch is a common reason new friendships fade.",
    optional: false,
    privacyLevel: "matching_only",
  },
  // ------------------------------------------- step 4: communication scenarios
  {
    id: "scenario_reply",
    step: 4,
    dimension: "communication",
    type: "scenario",
    prompt:
      "A new friend sends you a long, thoughtful message on a busy day. What's your honest pattern?",
    howThisHelps: "Cadence expectations, matched early, prevent quiet disappointment.",
    options: [
      { value: "reply_fast", label: "Reply soon, even briefly", description: "I don't like leaving people waiting" },
      { value: "reply_later_long", label: "Wait until I can reply properly", description: "They deserve a real response" },
      { value: "reply_varies", label: "It varies a lot", description: "Depends on the week I'm having" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "scenario_depth",
    step: 4,
    dimension: "communication",
    type: "scenario",
    prompt: "Twenty minutes into a first hangout, which conversation are you hoping for?",
    howThisHelps: "We pair people whose idea of a good conversation overlaps.",
    options: [
      { value: "depth_light", label: "Fun and easy", description: "Stories, laughs, recommendations" },
      { value: "depth_mixed", label: "A natural drift", description: "Light start, deeper if it flows" },
      { value: "depth_deep", label: "The real stuff", description: "Ideas, feelings, what actually matters" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "scenario_conflict",
    step: 4,
    dimension: "communication",
    type: "scenario",
    prompt: "A friend cancels on you twice in a row. You…",
    howThisHelps: "Conflict style compatibility keeps small bumps small.",
    options: [
      { value: "conflict_direct", label: "Say it plainly", description: "'Hey, twice in a row stings a bit.'" },
      { value: "conflict_gentle", label: "Mention it gently", description: "Raise it softly when it feels right" },
      { value: "conflict_internal", label: "Let it go, watch the pattern", description: "Actions over conversations" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "directness",
    step: 4,
    dimension: "personality",
    type: "slider",
    prompt: "In conversation, you seem to be…",
    min: 0,
    max: 100,
    minLabel: "Diplomatic and careful",
    maxLabel: "Direct and unfiltered",
    howThisHelps: "Neither is better — but big gaps benefit from a heads-up.",
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "curiosity",
    step: 4,
    dimension: "personality",
    type: "slider",
    prompt: "Your relationship with new ideas and experiences?",
    min: 0,
    max: 100,
    minLabel: "I love my known favorites",
    maxLabel: "Endlessly curious",
    howThisHelps: "Curiosity alignment predicts how adventurous your plans can be.",
    optional: false,
    privacyLevel: "matching_only",
  },
  // ------------------------------------------------- step 5: emotional (optional)
  {
    id: "vulnerability_pace",
    step: 5,
    dimension: "emotional",
    type: "slider",
    prompt: "How quickly do you tend to open up with new people?",
    min: 0,
    max: 100,
    minLabel: "Slowly, over time",
    maxLabel: "Quickly, if it feels safe",
    howThisHelps: "We pair compatible paces so nobody feels rushed or held away.",
    optional: true,
    sensitive: true,
    privacyLevel: "private",
  },
  {
    id: "support_style",
    step: 5,
    dimension: "emotional",
    type: "scenario",
    prompt: "A friend calls you upset about work. Your instinct is to…",
    howThisHelps: "Support-style fit makes hard weeks easier for both of you.",
    options: [
      { value: "support_listen", label: "Listen first", description: "Space to vent matters most" },
      { value: "support_solve", label: "Help fix it", description: "Ideas and next steps show I care" },
      { value: "support_distract", label: "Lift the mood", description: "Perspective and lightness help" },
    ],
    optional: true,
    sensitive: true,
    privacyLevel: "private",
  },
  {
    id: "reassurance",
    step: 5,
    dimension: "emotional",
    type: "slider",
    prompt: "In new friendships, how much explicit reassurance feels good?",
    min: 0,
    max: 100,
    minLabel: "Low-key — actions are enough",
    maxLabel: "Warm and expressed often",
    howThisHelps: "Matching expression styles avoids 'do they even like me?' anxiety.",
    optional: true,
    sensitive: true,
    privacyLevel: "private",
  },
  // ------------------------------------------------ step 6: outing preferences
  {
    id: "formats",
    step: 6,
    dimension: "interests",
    type: "tags",
    prompt: "Which outing formats appeal to you these days?",
    maxSelections: 6,
    howThisHelps: "We recommend what you want more of now — not just past hobbies.",
    options: [
      { value: "coffee", label: "Coffee & conversation" },
      { value: "walks", label: "Walks & nature" },
      { value: "food", label: "Food adventures" },
      { value: "books", label: "Books & ideas" },
      { value: "art", label: "Art & museums" },
      { value: "making", label: "Making & crafts" },
      { value: "movement", label: "Movement & sport" },
      { value: "music", label: "Live music" },
      { value: "games", label: "Board games" },
      { value: "photography", label: "Photography" },
      { value: "volunteering", label: "Volunteering" },
      { value: "markets", label: "Markets & neighborhoods" },
    ],
    optional: false,
    privacyLevel: "visible",
  },
  {
    id: "budget",
    step: 6,
    dimension: "lifestyle",
    type: "single",
    prompt: "A comfortable spend for a casual outing?",
    howThisHelps: "Budget fit is filtered quietly — nobody has to explain money.",
    options: [
      { value: "free", label: "Free is beautiful" },
      { value: "under_20", label: "Under S$20" },
      { value: "20_50", label: "S$20–50" },
      { value: "over_50", label: "S$50+ is fine" },
    ],
    optional: false,
    privacyLevel: "matching_only",
  },
  {
    id: "comfort",
    step: 6,
    dimension: "lifestyle",
    type: "multi",
    prompt: "Any of these make an outing better for you?",
    howThisHelps: "Comfort constraints are respected without being displayed.",
    options: [
      { value: "alcohol_free", label: "Alcohol-free settings" },
      { value: "wheelchair", label: "Step-free / wheelchair accessible" },
      { value: "quiet", label: "Quieter venues" },
      { value: "outdoor", label: "Outdoors when possible" },
      { value: "daytime", label: "Daytime endings" },
    ],
    optional: true,
    privacyLevel: "matching_only",
  },
  {
    id: "boundaries",
    step: 6,
    dimension: "boundaries",
    type: "multi",
    prompt: "Anything you'd rather keep out of early hangouts?",
    helper: "Private — used only to filter, never shown to anyone.",
    howThisHelps: "Boundaries are honored silently in matching and outing filters.",
    options: [
      { value: "no_bars", label: "Bar-centric plans" },
      { value: "no_late", label: "Late nights" },
      { value: "no_intense_exercise", label: "Intense exercise" },
      { value: "no_politics", label: "Heavy politics" },
      { value: "no_networking", label: "Networking energy" },
    ],
    optional: true,
    privacyLevel: "private",
  },
  // ------------------------------------------------- step 7: profile expression
  {
    id: "bio",
    step: 7,
    dimension: "expression",
    type: "text",
    prompt: "A short intro, as if to a friendly stranger.",
    placeholder: "What you're about, in a sentence or two…",
    maxLength: 280,
    howThisHelps: "Shown on your profile — the human layer no algorithm can write.",
    optional: false,
    privacyLevel: "visible",
  },
  {
    id: "friendship_feels_like",
    step: 7,
    dimension: "expression",
    type: "text",
    prompt: "\u201CA good friendship with me feels like\u2026\u201D",
    placeholder: "…slow mornings, honest opinions, and someone who texts back eventually.",
    maxLength: 200,
    howThisHelps: "This line appears on your profile and helps others feel your vibe.",
    optional: false,
    privacyLevel: "visible",
  },
];

export const TOTAL_DNA_STEPS = DNA_STEPS.length;

export function questionsForStep(step: number): DnaQuestion[] {
  return DNA_QUESTIONS.filter((q) => q.step === step);
}

export function getQuestion(id: string): DnaQuestion | undefined {
  return DNA_QUESTIONS.find((q) => q.id === id);
}
