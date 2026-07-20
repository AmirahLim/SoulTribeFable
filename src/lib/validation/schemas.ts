import { z } from "zod";

/**
 * Shared validation schemas — imported by both API routes (server-side
 * enforcement) and client forms (immediate feedback). One source of truth.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.")
  .max(254);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password is too long.")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Include at least one letter and one number.",
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Your name needs at least 2 characters.")
  .max(40, "Keep your name under 40 characters.")
  .regex(/^[\p{L}\p{N} .'’-]+$/u, "Please use letters, numbers and simple punctuation only.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter your date of birth.")
    .refine((v) => {
      const age = (Date.now() - new Date(v + "T00:00:00Z").getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18 && age < 110;
    }, "Soul Tribe is for adults aged 18 and over."),
  pledgeAccepted: z.literal(true, {
    message: "Please read and accept the community pledge.",
  }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const dnaAnswersSchema = z.object({
  step: z.number().int().min(1).max(7),
  answers: z.record(
    z.string().regex(/^[a-z_]{2,40}$/),
    z.union([
      z.string().max(500),
      z.number().min(0).max(100),
      z.array(z.string().max(60)).max(12),
    ])
  ),
});

export const summaryEditSchema = z.object({
  headline: z.string().trim().min(4).max(120).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z_]{2,40}$/),
        text: z.string().trim().min(0).max(500),
        hidden: z.boolean(),
      })
    )
    .max(12)
    .optional(),
  regenerate: z.boolean().optional(),
});

export const OUTING_CATEGORIES = [
  "coffee",
  "food",
  "walks",
  "art",
  "books",
  "making",
  "movement",
  "music",
  "games",
  "photography",
  "volunteering",
  "markets",
] as const;

export const AREAS = [
  "Tiong Bahru",
  "Katong / Joo Chiat",
  "Holland Village",
  "Ang Mo Kio",
  "Serangoon",
  "Tanjong Pagar",
  "Bugis / Kampong Glam",
  "Clementi",
  "Punggol",
  "East Coast",
] as const;

export const outingCreateSchema = z.object({
  title: z.string().trim().min(6, "Give your outing a short, clear title.").max(80),
  pitch: z
    .string()
    .trim()
    .min(30, "Tell people a little more — at least 30 characters.")
    .max(600),
  category: z.enum(OUTING_CATEGORIES),
  startsAt: z.number().int().positive(),
  durationMins: z.number().int().min(30).max(360),
  area: z.enum(AREAS),
  venueName: z.string().trim().min(3).max(80),
  venueAddress: z.string().trim().min(5).max(160),
  capacity: z.number().int().min(1).max(12),
  groupFormat: z.enum(["one_on_one", "small_group"]),
  visibility: z.enum(["public", "recommended_only", "invite_only"]),
  approvalMode: z.enum(["approval", "open"]),
  requestDeadlineHoursBefore: z.number().int().min(2).max(168),
  hostPrompt: z.string().trim().min(5).max(160),
  preferences: z.object({
    budgetBand: z.enum(["free", "under_20", "20_50", "over_50"]),
    energyLevel: z.enum(["calm", "balanced", "lively"]),
    conversationDepth: z.enum(["light", "mixed", "deep"]),
    structured: z.boolean(),
    alcoholFree: z.boolean(),
    indoor: z.boolean(),
    wheelchairAccessible: z.boolean(),
    languages: z.array(z.string().max(30)).min(1).max(6),
    firstTimerFriendly: z.boolean(),
    minFitBand: z.enum(["none", "worth_exploring", "promising", "strong"]),
  }),
});

export const joinRequestSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, "A sentence or two helps the host say yes.")
    .max(400),
});

export const requestDecisionSchema = z.object({
  decision: z.enum(["accept", "decline", "withdraw"]),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Say something first.").max(2000),
});

export const reflectionSchema = z.object({
  attended: z.boolean(),
  comfort: z.number().int().min(1).max(5),
  connection: z.number().int().min(1).max(5),
  futureIntent: z.enum(["would_meet_again", "maybe", "not_a_fit"]),
  privateText: z.string().trim().max(1000).default(""),
  subjectIds: z.array(z.string().max(64)).max(12).default([]),
});

export const REPORT_CATEGORIES = [
  { value: "harassment", label: "Harassment, hate or discrimination" },
  { value: "romantic_boundary", label: "Romantic or sexual boundary violation" },
  { value: "impersonation", label: "Impersonation, scam or misleading identity" },
  { value: "unsafe_outing", label: "Unsafe outing, coercion or location concern" },
  { value: "underage", label: "Underage user or age misrepresentation" },
  { value: "spam_noshow", label: "Repeated no-shows, spam or disruptive hosting" },
  { value: "inappropriate_content", label: "Inappropriate content or privacy violation" },
] as const;

export const reportSchema = z.object({
  subjectType: z.enum(["user", "outing", "message"]),
  subjectId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  category: z.enum(REPORT_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  details: z.string().trim().max(2000).default(""),
});

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema.optional(),
  pronouns: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(280).optional(),
  friendshipFeelsLike: z.string().trim().max(200).optional(),
  lifeSeason: z.string().trim().max(40).optional(),
  visibility: z.enum(["community", "matches_only", "hidden"]).optional(),
  avatarSeed: z.string().trim().max(60).optional(),
});

export const settingsSchema = z.object({
  notificationPrefs: z
    .object({
      soulDrop: z.boolean(),
      requests: z.boolean(),
      reminders: z.boolean(),
      reconnect: z.boolean(),
    })
    .optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type OutingCreateInput = z.infer<typeof outingCreateSchema>;
export type ReflectionInput = z.infer<typeof reflectionSchema>;
