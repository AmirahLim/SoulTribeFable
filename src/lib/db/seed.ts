import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  users,
  profiles,
  dnaAnswers,
  dnaVectors,
  dnaSummaries,
  outings,
  outingPreferences,
  joinRequests,
  outingMembers,
  conversations,
  messages,
  notifications,
  feedback,
} from "./schema";
import { buildVectors, VECTOR_SOURCE_VERSION, type AnswerMap } from "@/lib/dna/vectors";
import { getAIProvider } from "@/lib/ai";
import { newId } from "@/lib/server/ids";

/**
 * Seed data: a dense little Singapore beta cohort so every surface of the
 * product demonstrates well — Soul Drop, explainable matches, outings in
 * multiple states, join requests, chats, reflections and notifications.
 *
 * Demo account:  amirah@demo.soultribe.app  /  friendship-2026
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = Date.now();

interface Persona {
  key: string;
  name: string;
  pronouns: string;
  email: string;
  neighborhood: string;
  answers: AnswerMap;
}

const personas: Persona[] = [
  {
    key: "amirah",
    name: "Amirah Lim",
    pronouns: "she/her",
    email: "amirah@demo.soultribe.app",
    neighborhood: "east",
    answers: {
      languages: ["english", "malay"],
      intent: "close_friends",
      neighborhood: "east",
      life_season: "exploring",
      wanting_more: ["deep_conversation", "creativity", "consistency"],
      availability: ["weekday_evening", "weekend_day"],
      planning_style: 30,
      group_size: "one_on_one",
      social_frequency: 55,
      scenario_reply: "reply_later_long",
      scenario_depth: "depth_deep",
      scenario_conflict: "conflict_gentle",
      directness: 45,
      curiosity: 80,
      vulnerability_pace: 40,
      support_style: "support_listen",
      reassurance: 55,
      formats: ["books", "coffee", "art", "walks"],
      budget: "20_50",
      comfort: ["quiet", "daytime"],
      boundaries: ["no_networking"],
      bio: "Designer who collects secondhand books faster than I can read them. Slow mornings, long walks, honest conversations.",
      friendship_feels_like:
        "…a standing coffee date that neither of us ever cancels, and honest opinions delivered kindly.",
    },
  },
  {
    key: "mei",
    name: "Mei Chen",
    pronouns: "she/her",
    email: "mei@demo.soultribe.app",
    neighborhood: "east",
    answers: {
      languages: ["english", "mandarin"],
      intent: "close_friends",
      neighborhood: "east",
      life_season: "exploring",
      wanting_more: ["deep_conversation", "quiet_company"],
      availability: ["weekend_day", "weekday_evening"],
      planning_style: 25,
      group_size: "one_on_one",
      social_frequency: 50,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_deep",
      scenario_conflict: "conflict_gentle",
      directness: 40,
      curiosity: 70,
      vulnerability_pace: 45,
      support_style: "support_listen",
      reassurance: 60,
      formats: ["books", "coffee", "walks", "markets"],
      budget: "20_50",
      comfort: ["quiet"],
      boundaries: [],
      bio: "Editor at a small press. I believe every neighborhood has one perfect kopitiam and I intend to find them all.",
      friendship_feels_like: "…comfortable silences, book swaps, and remembering the small things.",
    },
  },
  {
    key: "darren",
    name: "Darren Ong",
    pronouns: "he/him",
    email: "darren@demo.soultribe.app",
    neighborhood: "central",
    answers: {
      languages: ["english", "mandarin"],
      intent: "activity_partners",
      neighborhood: "central",
      life_season: "career_intense",
      wanting_more: ["shared_activities", "spontaneity"],
      availability: ["weekend_day", "weekend_evening"],
      planning_style: 75,
      group_size: "small",
      social_frequency: 70,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_light",
      scenario_conflict: "conflict_direct",
      directness: 80,
      curiosity: 85,
      formats: ["movement", "food", "photography", "markets"],
      budget: "20_50",
      comfort: ["outdoor"],
      boundaries: [],
      bio: "Product manager, weekend cyclist, unapologetic hawker-stall evangelist. I plan nothing and somehow it works.",
      friendship_feels_like: "…someone texting 'you free in an hour?' and the answer being yes.",
    },
  },
  {
    key: "priya",
    name: "Priya Nair",
    pronouns: "she/her",
    email: "priya@demo.soultribe.app",
    neighborhood: "central",
    answers: {
      languages: ["english", "tamil"],
      intent: "fresh_start",
      neighborhood: "central",
      life_season: "new_city",
      wanting_more: ["deep_conversation", "consistency", "creativity"],
      availability: ["weekday_evening", "weekend_day", "weekend_evening"],
      planning_style: 40,
      group_size: "either",
      social_frequency: 65,
      scenario_reply: "reply_later_long",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_direct",
      directness: 65,
      curiosity: 90,
      vulnerability_pace: 65,
      support_style: "support_solve",
      reassurance: 70,
      formats: ["art", "music", "coffee", "food", "making"],
      budget: "20_50",
      comfort: [],
      boundaries: ["no_late"],
      bio: "Moved from Chennai three months ago for a research role. Building my Singapore life one gallery and one dosa at a time.",
      friendship_feels_like: "…being shown someone's favorite corner of the city and trading one of mine.",
    },
  },
  {
    key: "wei_lin",
    name: "Wei Lin Tan",
    pronouns: "she/her",
    email: "weilin@demo.soultribe.app",
    neighborhood: "west",
    answers: {
      languages: ["english", "mandarin", "cantonese"],
      intent: "local_circle",
      neighborhood: "west",
      life_season: "parenting",
      wanting_more: ["quiet_company", "consistency"],
      availability: ["weekday_day", "weekend_day"],
      planning_style: 15,
      group_size: "small",
      social_frequency: 35,
      scenario_reply: "reply_varies",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_internal",
      directness: 35,
      curiosity: 45,
      formats: ["walks", "coffee", "making", "volunteering"],
      budget: "under_20",
      comfort: ["daytime", "alcohol_free", "quiet"],
      boundaries: ["no_late", "no_bars"],
      bio: "Mum of two, former pastry chef, current sourdough scientist. Daytime friendships are my love language now.",
      friendship_feels_like: "…a morning walk that becomes a standing tradition, prams welcome.",
    },
  },
  {
    key: "marcus",
    name: "Marcus Teo",
    pronouns: "he/him",
    email: "marcus@demo.soultribe.app",
    neighborhood: "central",
    answers: {
      languages: ["english"],
      intent: "close_friends",
      neighborhood: "central",
      life_season: "rebuilding",
      wanting_more: ["deep_conversation", "shared_activities"],
      availability: ["weekday_evening", "weekend_evening"],
      planning_style: 45,
      group_size: "small",
      social_frequency: 55,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_deep",
      scenario_conflict: "conflict_gentle",
      directness: 55,
      curiosity: 75,
      vulnerability_pace: 55,
      support_style: "support_listen",
      reassurance: 65,
      formats: ["games", "books", "food", "music"],
      budget: "20_50",
      comfort: [],
      boundaries: [],
      bio: "Recently divorced, gently rebuilding. Software engineer who hosts a mean board game night and asks real questions.",
      friendship_feels_like: "…games on the table, guards down, and conversations that outlast the last round.",
    },
  },
  {
    key: "sofia",
    name: "Sofia Hartono",
    pronouns: "she/her",
    email: "sofia@demo.soultribe.app",
    neighborhood: "east",
    answers: {
      languages: ["english", "malay"],
      intent: "activity_partners",
      neighborhood: "east",
      life_season: "exploring",
      wanting_more: ["creativity", "spontaneity", "shared_activities"],
      availability: ["weekend_day", "weekend_evening", "weekday_evening"],
      planning_style: 65,
      group_size: "small",
      social_frequency: 75,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_direct",
      directness: 70,
      curiosity: 88,
      vulnerability_pace: 70,
      support_style: "support_distract",
      reassurance: 45,
      formats: ["photography", "art", "markets", "music", "food"],
      budget: "20_50",
      comfort: ["outdoor"],
      boundaries: [],
      bio: "Freelance photographer chasing good light and better company. My camera roll is 80% Katong shophouses.",
      friendship_feels_like: "…golden hour walks, spontaneous detours, and celebrating each other's weird projects.",
    },
  },
  {
    key: "raj",
    name: "Raj Kumar",
    pronouns: "he/him",
    email: "raj@demo.soultribe.app",
    neighborhood: "northeast",
    answers: {
      languages: ["english", "tamil"],
      intent: "local_circle",
      neighborhood: "northeast",
      life_season: "career_intense",
      wanting_more: ["consistency", "quiet_company"],
      availability: ["weekend_day"],
      planning_style: 20,
      group_size: "either",
      social_frequency: 40,
      scenario_reply: "reply_later_long",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_internal",
      directness: 40,
      curiosity: 55,
      formats: ["walks", "volunteering", "books", "coffee"],
      budget: "under_20",
      comfort: ["alcohol_free", "quiet", "daytime"],
      boundaries: ["no_bars", "no_late"],
      bio: "Doctor, marathon-of-life pace. Sundays are sacred: park connectors, quiet cafés, and one good conversation.",
      friendship_feels_like: "…low-frequency, high-trust. We may not talk for two weeks and nothing changes.",
    },
  },
  {
    key: "elena",
    name: "Elena Volkova",
    pronouns: "she/her",
    email: "elena@demo.soultribe.app",
    neighborhood: "central",
    answers: {
      languages: ["english", "other"],
      intent: "fresh_start",
      neighborhood: "central",
      life_season: "new_city",
      wanting_more: ["shared_activities", "spontaneity", "creativity"],
      availability: ["weekday_evening", "weekend_day", "weekend_evening"],
      planning_style: 70,
      group_size: "small",
      social_frequency: 80,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_light",
      scenario_conflict: "conflict_direct",
      directness: 75,
      curiosity: 92,
      vulnerability_pace: 60,
      support_style: "support_distract",
      reassurance: 40,
      formats: ["movement", "music", "food", "markets", "photography"],
      budget: "over_50",
      comfort: ["outdoor"],
      boundaries: [],
      bio: "Architect from Tbilisi via Berlin, six weeks into Singapore. Yes to almost everything, at least once.",
      friendship_feels_like: "…being each other's excuse to finally try the thing.",
    },
  },
  {
    key: "hafiz",
    name: "Hafiz Rahman",
    pronouns: "he/him",
    email: "hafiz@demo.soultribe.app",
    neighborhood: "east",
    answers: {
      languages: ["english", "malay"],
      intent: "close_friends",
      neighborhood: "east",
      life_season: "rebuilding",
      wanting_more: ["deep_conversation", "consistency", "quiet_company"],
      availability: ["weekday_evening", "weekend_day"],
      planning_style: 35,
      group_size: "one_on_one",
      social_frequency: 45,
      scenario_reply: "reply_later_long",
      scenario_depth: "depth_deep",
      scenario_conflict: "conflict_gentle",
      directness: 50,
      curiosity: 65,
      vulnerability_pace: 35,
      support_style: "support_listen",
      reassurance: 60,
      formats: ["coffee", "books", "walks", "volunteering"],
      budget: "under_20",
      comfort: ["alcohol_free", "quiet"],
      boundaries: ["no_bars"],
      bio: "Teacher, amateur birdwatcher, professional listener. Moved back to Singapore after five years abroad and starting over, socially.",
      friendship_feels_like: "…long kopi sessions where the second hour is better than the first.",
    },
  },
  {
    key: "grace",
    name: "Grace Koh",
    pronouns: "she/her",
    email: "grace@demo.soultribe.app",
    neighborhood: "north",
    answers: {
      languages: ["english", "mandarin"],
      intent: "local_circle",
      neighborhood: "north",
      life_season: "exploring",
      wanting_more: ["creativity", "shared_activities"],
      availability: ["weekend_day", "weekday_day"],
      planning_style: 40,
      group_size: "small",
      social_frequency: 50,
      scenario_reply: "reply_varies",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_gentle",
      directness: 45,
      curiosity: 72,
      formats: ["making", "art", "markets", "coffee"],
      budget: "20_50",
      comfort: ["daytime"],
      boundaries: [],
      bio: "Retired early from finance, now elbow-deep in clay. My pottery teacher says I have 'enthusiasm'. Convener of gentle people.",
      friendship_feels_like: "…making things side by side and critiquing each other's glazes lovingly.",
    },
  },
  {
    key: "jun",
    name: "Jun Park",
    pronouns: "he/him",
    email: "jun@demo.soultribe.app",
    neighborhood: "central",
    answers: {
      languages: ["english", "other"],
      intent: "activity_partners",
      neighborhood: "central",
      life_season: "career_intense",
      wanting_more: ["spontaneity", "shared_activities"],
      availability: ["weekday_evening", "weekend_evening"],
      planning_style: 85,
      group_size: "small",
      social_frequency: 60,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_light",
      scenario_conflict: "conflict_direct",
      directness: 72,
      curiosity: 78,
      formats: ["music", "food", "games", "movement"],
      budget: "over_50",
      comfort: [],
      boundaries: [],
      bio: "Fintech by day, live-music completionist by night. If there's a gig on, I've probably got a spare ticket.",
      friendship_feels_like: "…last-minute plans that become the best story of the month.",
    },
  },
  {
    key: "nadia",
    name: "Nadia Osman",
    pronouns: "she/her",
    email: "nadia@demo.soultribe.app",
    neighborhood: "northeast",
    answers: {
      languages: ["english", "malay"],
      intent: "fresh_start",
      neighborhood: "northeast",
      life_season: "rebuilding",
      wanting_more: ["deep_conversation", "creativity", "quiet_company"],
      availability: ["weekend_day", "weekday_evening"],
      planning_style: 30,
      group_size: "one_on_one",
      social_frequency: 45,
      scenario_reply: "reply_later_long",
      scenario_depth: "depth_deep",
      scenario_conflict: "conflict_internal",
      directness: 38,
      curiosity: 68,
      vulnerability_pace: 30,
      support_style: "support_listen",
      reassurance: 72,
      formats: ["books", "art", "coffee", "walks", "making"],
      budget: "under_20",
      comfort: ["quiet", "alcohol_free"],
      boundaries: ["no_bars", "no_networking"],
      bio: "Illustrator slowly returning to the world after a heavy year. Sketchbook always in bag. Gentle people, please.",
      friendship_feels_like: "…being quietly understood, with occasional excellent cake.",
    },
  },
  {
    key: "ben",
    name: "Ben Carter",
    pronouns: "he/him",
    email: "ben@demo.soultribe.app",
    neighborhood: "west",
    answers: {
      languages: ["english"],
      intent: "local_circle",
      neighborhood: "west",
      life_season: "new_city",
      wanting_more: ["shared_activities", "consistency"],
      availability: ["weekday_evening", "weekend_day", "weekend_evening"],
      planning_style: 50,
      group_size: "small",
      social_frequency: 65,
      scenario_reply: "reply_fast",
      scenario_depth: "depth_mixed",
      scenario_conflict: "conflict_direct",
      directness: 60,
      curiosity: 70,
      vulnerability_pace: 50,
      support_style: "support_solve",
      reassurance: 50,
      formats: ["movement", "games", "food", "walks"],
      budget: "20_50",
      comfort: ["outdoor"],
      boundaries: [],
      bio: "Physio from Manchester, eight months in. Looking for a regular five-a-side crew and people who'll laugh at my accent kindly.",
      friendship_feels_like: "…a weekly kickabout followed by supper that runs long.",
    },
  },
];

const AVATAR_SEEDS: Record<string, string> = {
  amirah: "terracotta-01", mei: "sage-02", darren: "gold-03", priya: "clay-04",
  wei_lin: "sand-05", marcus: "forest-06", sofia: "amber-07", raj: "moss-08",
  elena: "sunset-09", hafiz: "olive-10", grace: "dune-11", jun: "ember-12",
  nadia: "rose-13", ben: "stone-14",
};

export async function seedDatabase() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log("✓ database already seeded — skipping (run `npm run db:reset` for a fresh start)");
    return;
  }

  console.log("Seeding Soul Tribe demo cohort…");
  const passwordHash = await bcrypt.hash("friendship-2026", 10);
  const ai = getAIProvider();
  const ids: Record<string, string> = {};

  for (const p of personas) {
    const id = newId("usr");
    ids[p.key] = id;
    await db.insert(users).values({
      id,
      email: p.email,
      passwordHash,
      status: "active",
      birthDate: "1993-05-14",
      city: "Singapore",
      onboardingStep: 7,
      onboardingComplete: true,
      isAdmin: p.key === "amirah",
      createdAt: now - 30 * DAY,
      lastActiveAt: now - Math.floor(Math.random() * 2 * DAY),
    });
    await db.insert(profiles).values({
      userId: id,
      displayName: p.name,
      pronouns: p.pronouns,
      avatarSeed: AVATAR_SEEDS[p.key],
      bio: String(p.answers["bio"] ?? ""),
      friendshipFeelsLike: String(p.answers["friendship_feels_like"] ?? ""),
      languages: (p.answers["languages"] as string[]) ?? ["english"],
      neighborhood: String(p.answers["neighborhood"] ?? "central"),
      lifeSeason: String(p.answers["life_season"] ?? ""),
      visibility: "community",
      intent: String(p.answers["intent"] ?? ""),
    });

    // Raw answers.
    for (const [qid, answer] of Object.entries(p.answers)) {
      await db.insert(dnaAnswers).values({
        userId: id,
        questionId: qid,
        answer,
        privacyLevel: ["vulnerability_pace", "support_style", "reassurance", "boundaries"].includes(qid)
          ? "private"
          : "matching_only",
        updatedAt: now - 29 * DAY,
      });
    }

    // Derived vectors.
    for (const v of buildVectors(p.answers)) {
      await db.insert(dnaVectors).values({
        userId: id,
        dimension: v.dimension,
        values: v.values,
        confidence: v.confidence,
        sourceVersion: VECTOR_SOURCE_VERSION,
        updatedAt: now - 29 * DAY,
      });
    }

    // Editable AI summary.
    const summary = ai.generateDnaSummary(p.answers, p.name);
    await db.insert(dnaSummaries).values({
      userId: id,
      headline: summary.headline,
      sections: summary.sections,
      modelVersion: summary.modelVersion,
      updatedAt: now - 29 * DAY,
    });
  }

  // ------------------------------------------------------------- outings
  const outingDefs = [
    {
      key: "bookswap",
      host: "mei",
      title: "Secondhand book swap & slow coffee",
      pitch:
        "Bring two books you loved but are ready to release. We'll swap stories and titles over long blacks at a quiet Joo Chiat café. Low-key, unhurried, maximum six of us.",
      category: "books",
      startsAt: now + 5 * DAY + 2 * HOUR,
      durationMins: 120,
      area: "Katong / Joo Chiat",
      venueName: "Common Man Coffee (Joo Chiat)",
      venueAddress: "185 Joo Chiat Road, #01-01",
      capacity: 6,
      groupFormat: "small_group" as const,
      budget: "under_20" as const,
      energy: "calm" as const,
      depthPref: "deep" as const,
      alcoholFree: true,
      indoor: true,
      status: "published" as const,
    },
    {
      key: "photowalk",
      host: "sofia",
      title: "Golden-hour photo walk: Katong shophouses",
      pitch:
        "A slow wander through the pastel streets of Katong as the light turns good. Any camera counts, phone included. We end with grape soda at a corner kopitiam and compare favorite frames.",
      category: "photography",
      startsAt: now + 3 * DAY + 9 * HOUR,
      durationMins: 90,
      area: "Katong / Joo Chiat",
      venueName: "Meet at Katong Antique House",
      venueAddress: "208 East Coast Road",
      capacity: 5,
      groupFormat: "small_group" as const,
      budget: "free" as const,
      energy: "balanced" as const,
      depthPref: "mixed" as const,
      alcoholFree: true,
      indoor: false,
      status: "published" as const,
    },
    {
      key: "boardgames",
      host: "marcus",
      title: "Board games for people who talk mid-game",
      pitch:
        "Cosy games café session — think Wingspan and Codenames, not four-hour war campaigns. The games are honestly an excuse for good conversation. First-timers very welcome.",
      category: "games",
      startsAt: now + 6 * DAY + 11 * HOUR,
      durationMins: 150,
      area: "Tanjong Pagar",
      venueName: "The Mind Café",
      venueAddress: "60A Prinsep Street",
      capacity: 5,
      groupFormat: "small_group" as const,
      budget: "20_50" as const,
      energy: "balanced" as const,
      depthPref: "mixed" as const,
      alcoholFree: false,
      indoor: true,
      status: "published" as const,
    },
    {
      key: "claymorning",
      host: "grace",
      title: "Beginner pottery morning: bowls & banter",
      pitch:
        "A drop-in hand-building session at my favorite studio. We'll each make one wonky bowl and mock them affectionately. All materials provided. Gentle pace, daytime energy.",
      category: "making",
      startsAt: now + 8 * DAY + 2 * HOUR,
      durationMins: 150,
      area: "Ang Mo Kio",
      venueName: "Studio Asobi",
      venueAddress: "165 Ang Mo Kio Ave 4",
      capacity: 4,
      groupFormat: "small_group" as const,
      budget: "over_50" as const,
      energy: "calm" as const,
      depthPref: "mixed" as const,
      alcoholFree: true,
      indoor: true,
      status: "published" as const,
    },
    {
      key: "hawkercrawl",
      host: "darren",
      title: "Old Airport Road hawker crawl (share everything)",
      pitch:
        "Six stalls, one table, zero food waste. We order communally and argue about the best char kway teow like it matters — because it does. Come hungry.",
      category: "food",
      startsAt: now + 4 * DAY + 10 * HOUR,
      durationMins: 120,
      area: "East Coast",
      venueName: "Old Airport Road Food Centre",
      venueAddress: "51 Old Airport Road",
      capacity: 6,
      groupFormat: "small_group" as const,
      budget: "under_20" as const,
      energy: "lively" as const,
      depthPref: "light" as const,
      alcoholFree: true,
      indoor: true,
      status: "published" as const,
    },
    {
      key: "sundaywalk",
      host: "raj",
      title: "Quiet Sunday walk: Punggol Waterway",
      pitch:
        "An easy 5km loop at conversation pace, early before the heat. No podcasts, no pace goals — just the waterway, the breeze, and whatever we end up talking about.",
      category: "walks",
      startsAt: now + 9 * DAY + 23 * HOUR,
      durationMins: 90,
      area: "Punggol",
      venueName: "Punggol Waterway Point entrance",
      venueAddress: "83 Punggol Central",
      capacity: 4,
      groupFormat: "small_group" as const,
      budget: "free" as const,
      energy: "calm" as const,
      depthPref: "deep" as const,
      alcoholFree: true,
      indoor: false,
      status: "published" as const,
    },
    // Amirah hosts this one — pending requests exercise the host dashboard.
    {
      key: "galleryhop",
      host: "amirah",
      title: "Gallery hop & one honest opinion each",
      pitch:
        "National Gallery, two exhibitions, then teh at the rooftop. House rule: everyone must voice exactly one strong opinion about the art, even (especially) an unpopular one.",
      category: "art",
      startsAt: now + 7 * DAY + 6 * HOUR,
      durationMins: 180,
      area: "Bugis / Kampong Glam",
      venueName: "National Gallery Singapore",
      venueAddress: "1 St Andrew's Road",
      capacity: 4,
      groupFormat: "small_group" as const,
      budget: "20_50" as const,
      energy: "calm" as const,
      depthPref: "deep" as const,
      alcoholFree: true,
      indoor: true,
      status: "published" as const,
    },
    // A past outing with Amirah as attendee — exercises reflections & memories.
    {
      key: "kopipast",
      host: "hafiz",
      title: "Long kopi & longer conversation",
      pitch:
        "Two hours, one kopitiam, no agenda. The kind of unhurried conversation that's hard to find after thirty.",
      category: "coffee",
      startsAt: now - 2 * DAY - 4 * HOUR,
      durationMins: 120,
      area: "Katong / Joo Chiat",
      venueName: "Chin Mee Chin Confectionery",
      venueAddress: "204 East Coast Road",
      capacity: 3,
      groupFormat: "small_group" as const,
      budget: "under_20" as const,
      energy: "calm" as const,
      depthPref: "deep" as const,
      alcoholFree: true,
      indoor: true,
      status: "completed" as const,
    },
    // A cancelled outing for state completeness.
    {
      key: "gigcancelled",
      host: "jun",
      title: "Indie gig at the Esplanade Annexe",
      pitch: "Local band, free entry, good sound. We grab supper after if the night deserves it.",
      category: "music",
      startsAt: now + 2 * DAY + 12 * HOUR,
      durationMins: 150,
      area: "Bugis / Kampong Glam",
      venueName: "Esplanade Annexe Studio",
      venueAddress: "1 Esplanade Drive",
      capacity: 5,
      groupFormat: "small_group" as const,
      budget: "free" as const,
      energy: "lively" as const,
      depthPref: "light" as const,
      alcoholFree: false,
      indoor: true,
      status: "cancelled" as const,
    },
    {
      key: "morningwalk",
      host: "wei_lin",
      title: "Prams-welcome morning walk, Jurong Lake Gardens",
      pitch:
        "A gentle weekday-morning loop for anyone whose social life now runs on nap schedules. Kids welcome, but so are people who just like slow mornings and good company.",
      category: "walks",
      startsAt: now + 5 * DAY - 2 * HOUR,
      durationMins: 90,
      area: "Clementi",
      venueName: "Jurong Lake Gardens, Entrance Pavilion",
      venueAddress: "104 Yuan Ching Road",
      capacity: 6,
      groupFormat: "small_group" as const,
      budget: "free" as const,
      energy: "calm" as const,
      depthPref: "mixed" as const,
      alcoholFree: true,
      indoor: false,
      status: "published" as const,
    },
  ];

  const outingIds: Record<string, string> = {};
  for (const o of outingDefs) {
    const id = newId("out");
    outingIds[o.key] = id;
    await db.insert(outings).values({
      id,
      hostId: ids[o.host],
      title: o.title,
      pitch: o.pitch,
      category: o.category,
      startsAt: o.startsAt,
      durationMins: o.durationMins,
      timezone: "Asia/Singapore",
      area: o.area,
      venueName: o.venueName,
      venueAddress: o.venueAddress,
      capacity: o.capacity,
      groupFormat: o.groupFormat,
      visibility: "public",
      approvalMode: "approval",
      requestDeadline: o.startsAt - 12 * HOUR,
      status: o.status,
      hostPrompt: "What makes this outing appealing to you today?",
      createdAt: now - 10 * DAY,
      updatedAt: now - 1 * DAY,
    });
    await db.insert(outingPreferences).values({
      outingId: id,
      budgetBand: o.budget,
      energyLevel: o.energy,
      conversationDepth: o.depthPref,
      structured: o.category === "making" || o.category === "games",
      alcoholFree: o.alcoholFree,
      indoor: o.indoor,
      wheelchairAccessible: o.key === "morningwalk" || o.key === "galleryhop",
      languages: ["english"],
      firstTimerFriendly: true,
      minFitBand: "none",
    });
    await db.insert(outingMembers).values({
      outingId: id,
      userId: ids[o.host],
      role: "host",
      attendanceStatus: o.status === "completed" ? "attended" : "confirmed",
      joinedAt: now - 10 * DAY,
    });
  }

  // ------------------------------------------------- members & join requests
  const accept = async (outingKey: string, userKey: string, attended = false) => {
    await db.insert(outingMembers).values({
      outingId: outingIds[outingKey],
      userId: ids[userKey],
      role: "attendee",
      attendanceStatus: attended ? "attended" : "confirmed",
      joinedAt: now - 3 * DAY,
    });
    await db.insert(joinRequests).values({
      id: newId("req"),
      outingId: outingIds[outingKey],
      requesterId: ids[userKey],
      note: "This sounds exactly like my kind of afternoon — I'd love to join.",
      status: "accepted",
      fitJson: null,
      createdAt: now - 4 * DAY,
      decidedAt: now - 3 * DAY,
    });
  };

  // Amirah accepted into Mei's book swap (chat available).
  await accept("bookswap", "amirah");
  await accept("bookswap", "hafiz");
  await accept("bookswap", "nadia");
  // Past kopi outing (completed) — Amirah & Mei attended; reflection pending for Amirah.
  await accept("kopipast", "amirah", true);
  await accept("kopipast", "mei", true);
  // Other outings get some members.
  await accept("photowalk", "elena");
  await accept("hawkercrawl", "ben");
  await accept("hawkercrawl", "jun");
  await accept("boardgames", "priya");
  await accept("morningwalk", "raj");

  // Pending requests for Amirah's gallery hop → host dashboard demo.
  const pendingReqs = [
    {
      user: "priya",
      note: "New to Singapore and the National Gallery has been on my list for weeks. I will absolutely bring an unpopular opinion.",
    },
    {
      user: "sofia",
      note: "I photograph art constantly but rarely talk about it. The one-honest-opinion rule sounds like exactly the push I need.",
    },
    {
      user: "marcus",
      note: "Rebuilding my weekends from scratch and this sounds like a lovely one. Warning: my art opinions are 90% about the gift shop.",
    },
  ];
  for (const r of pendingReqs) {
    await db.insert(joinRequests).values({
      id: newId("req"),
      outingId: outingIds["galleryhop"],
      requesterId: ids[r.user],
      note: r.note,
      status: "pending",
      fitJson: null,
      createdAt: now - Math.floor(Math.random() * 2 * DAY),
      decidedAt: null,
    });
  }

  // Amirah has a pending request out to Sofia's photo walk.
  await db.insert(joinRequests).values({
    id: newId("req"),
    outingId: outingIds["photowalk"],
    requesterId: ids["amirah"],
    note: "My camera roll needs fewer screenshots and more shophouses. I'd love to come along.",
    status: "pending",
    fitJson: null,
    createdAt: now - 1 * DAY,
    decidedAt: null,
  });

  // ------------------------------------------------------------ conversations
  const mkConversation = async (outingKey: string, msgs: [string, string, number][]) => {
    const convId = newId("cnv");
    await db.insert(conversations).values({
      id: convId,
      type: "outing",
      outingId: outingIds[outingKey],
      status: "open",
      createdAt: now - 3 * DAY,
    });
    for (const [senderKey, body, offset] of msgs) {
      await db.insert(messages).values({
        id: newId("msg"),
        conversationId: convId,
        senderId: senderKey === "system" ? "system" : ids[senderKey],
        body,
        moderationState: "clear",
        createdAt: now - offset,
      });
    }
  };

  await mkConversation("bookswap", [
    ["system", "Welcome to the outing chat for “Secondhand book swap & slow coffee”. Exact venue details are pinned above. Be kind, and reach out to Soul Tribe support if anything feels off.", 3 * DAY],
    ["mei", "So glad this filled up with exactly the right people. Gentle reminder: two books each, any genre, the more loved the better.", 2 * DAY + 6 * HOUR],
    ["hafiz", "Bringing a poetry collection and a birdwatching memoir — no surprises there. Looking forward to this.", 2 * DAY + 2 * HOUR],
    ["amirah", "One design book and one novel I've been pretending I'll reread for three years. It's time to let go 😄", 1 * DAY + 20 * HOUR],
    ["nadia", "Sketchbook is coming too — if anyone wants a tiny portrait of their book stack, I'm offering.", 1 * DAY + 4 * HOUR],
    ["mei", "Nadia that's the loveliest offer. See you all Saturday, 10am. I'll grab the corner table.", 20 * HOUR],
  ]);

  await mkConversation("kopipast", [
    ["system", "Welcome to the outing chat for “Long kopi & longer conversation”.", 5 * DAY],
    ["hafiz", "Thank you both for such an easy afternoon. The second hour really was better than the first.", 2 * DAY - 2 * HOUR],
    ["mei", "Agreed — and Amirah, I owe you that essay collection. Bringing it to the book swap.", 2 * DAY - HOUR],
    ["amirah", "This was exactly what a Tuesday needed. Same table next month?", 2 * DAY - 30 * 60000],
  ]);

  await mkConversation("galleryhop", [
    ["system", "Welcome to the outing chat for “Gallery hop & one honest opinion each”. Members appear here as the host accepts requests.", 2 * DAY],
  ]);

  // ------------------------------------------------------------- reflections
  await db.insert(feedback).values([
    {
      id: newId("fbk"),
      outingId: outingIds["kopipast"],
      authorId: ids["mei"],
      subjectId: ids["amirah"],
      attended: true,
      comfort: 5,
      connection: 5,
      futureIntent: "would_meet_again",
      privateText: "Amirah asks the kind of questions that make you feel interesting. Definitely again.",
      createdAt: now - 2 * DAY + 6 * HOUR,
    },
    {
      id: newId("fbk"),
      outingId: outingIds["kopipast"],
      authorId: ids["hafiz"],
      subjectId: null,
      attended: true,
      comfort: 5,
      connection: 4,
      futureIntent: "would_meet_again",
      privateText: "Hosting felt easy with this pair. Would host again.",
      createdAt: now - 2 * DAY + 5 * HOUR,
    },
  ]);

  // ------------------------------------------------------------ notifications
  const amirah = ids["amirah"];
  await db.insert(notifications).values([
    {
      id: newId("ntf"),
      userId: amirah,
      eventType: "join_request_received",
      payload: {
        title: "3 requests for your gallery hop",
        body: "Priya, Sofia and Marcus have asked to join. Review them before Friday.",
        href: "/outings/" + outingIds["galleryhop"] + "/manage",
      },
      sentAt: now - 6 * HOUR,
      readAt: null,
    },
    {
      id: newId("ntf"),
      userId: amirah,
      eventType: "post_outing_reflection",
      payload: {
        title: "How was the kopi session?",
        body: "A private reflection helps us make your next introduction better.",
        href: "/outings/" + outingIds["kopipast"] + "/reflect",
      },
      sentAt: now - 2 * DAY + 4 * HOUR,
      readAt: null,
    },
    {
      id: newId("ntf"),
      userId: amirah,
      eventType: "soul_drop",
      payload: {
        title: "Your Soul Drop is ready",
        body: "A few people and plans chosen for you this week — no feed, just fit.",
        href: "/home",
      },
      sentAt: now - 1 * DAY,
      readAt: now - 20 * HOUR,
    },
  ]);

  console.log(`✓ seeded ${personas.length} members, ${outingDefs.length} outings, chats, requests and reflections`);
  console.log("  demo sign-in → amirah@demo.soultribe.app / friendship-2026");
}

// Run only when executed directly (`npm run db:setup`), never when imported
// by the app (bootstrap.ts calls seedDatabase() itself).
if (process.argv[1]?.includes("seed")) {
  seedDatabase().catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
}
