import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Soul Tribe data model — mirrors PRD §12 "Core entities".
 *
 * Governance notes (PRD "Data governance"):
 *  - Auth data (users/sessions) is separated from public profile data.
 *  - Raw DNA answers, derived vectors and the user-editable AI summary are
 *    stored in three separate tables.
 *  - Recommendation explanations log the ruleset version that produced them.
 *  - Private reflections (feedback) are never joined into public surfaces.
 */

// ---------------------------------------------------------------- identity

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status", { enum: ["active", "deactivated", "restricted"] })
    .notNull()
    .default("active"),
  birthDate: text("birth_date").notNull(), // ISO date; age-gate enforced at signup
  city: text("city").notNull().default("Singapore"),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" })
    .notNull()
    .default(false),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  notificationPrefs: text("notification_prefs", { mode: "json" })
    .$type<{ soulDrop: boolean; requests: boolean; reminders: boolean; reconnect: boolean }>()
    .notNull()
    .default({ soulDrop: true, requests: true, reminders: true, reconnect: true }),
  createdAt: integer("created_at").notNull(),
  lastActiveAt: integer("last_active_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha-256 of the opaque cookie token
    userId: text("user_id").notNull(),
    csrfToken: text("csrf_token").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ userIdx: index("sessions_user_idx").on(t.userId) })
);

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  pronouns: text("pronouns"),
  avatarSeed: text("avatar_seed").notNull(), // deterministic warm-toned avatar
  bio: text("bio").notNull().default(""),
  friendshipFeelsLike: text("friendship_feels_like").notNull().default(""),
  languages: text("languages", { mode: "json" }).$type<string[]>().notNull(),
  neighborhood: text("neighborhood").notNull().default(""),
  lifeSeason: text("life_season").notNull().default(""),
  visibility: text("visibility", {
    enum: ["community", "matches_only", "hidden"],
  })
    .notNull()
    .default("community"),
  intent: text("intent").notNull().default(""),
});

// ------------------------------------------------------------ friendship DNA

export const dnaAnswers = sqliteTable(
  "friendship_dna_answers",
  {
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    answer: text("answer", { mode: "json" }).$type<unknown>().notNull(),
    privacyLevel: text("privacy_level", {
      enum: ["matching_only", "visible", "private"],
    })
      .notNull()
      .default("matching_only"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.questionId] }) })
);

export const dnaVectors = sqliteTable(
  "friendship_dna_vectors",
  {
    userId: text("user_id").notNull(),
    dimension: text("dimension").notNull(),
    // JSON map of attribute -> normalized value in [0, 1]
    values: text("values", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull(),
    confidence: real("confidence").notNull().default(0.5),
    sourceVersion: text("source_version").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.dimension] }) })
);

/** User-editable AI summary, stored separately from raw answers (governance). */
export const dnaSummaries = sqliteTable("dna_summaries", {
  userId: text("user_id").primaryKey(),
  headline: text("headline").notNull(),
  // Each paragraph is individually editable / hideable / regenerable (PRD §9)
  sections: text("sections", { mode: "json" })
    .$type<{ id: string; dimension: string; text: string; hidden: boolean; edited: boolean }[]>()
    .notNull(),
  modelVersion: text("model_version").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ---------------------------------------------------------------- matching

export const matchRecommendations = sqliteTable(
  "match_recommendations",
  {
    id: text("id").primaryKey(),
    viewerId: text("viewer_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    scoreBand: text("score_band", {
      enum: ["kindred", "strong", "promising", "worth_exploring"],
    }).notNull(),
    score: real("score").notNull(),
    reasonJson: text("reason_json", { mode: "json" })
      .$type<import("@/lib/matching/types").MatchExplanation>()
      .notNull(),
    rulesetVersion: text("ruleset_version").notNull(),
    status: text("status", { enum: ["fresh", "viewed", "saved", "dismissed"] })
      .notNull()
      .default("fresh"),
    weekKey: text("week_key").notNull(), // Soul Drop cohort key, e.g. 2026-W28
    generatedAt: integer("generated_at").notNull(),
  },
  (t) => ({
    viewerIdx: index("match_viewer_idx").on(t.viewerId, t.weekKey),
  })
);

// ----------------------------------------------------------------- outings

export const outings = sqliteTable(
  "outings",
  {
    id: text("id").primaryKey(),
    hostId: text("host_id").notNull(),
    title: text("title").notNull(),
    pitch: text("pitch").notNull(),
    category: text("category").notNull(),
    startsAt: integer("starts_at").notNull(), // epoch ms UTC
    durationMins: integer("duration_mins").notNull(),
    timezone: text("timezone").notNull().default("Asia/Singapore"),
    area: text("area").notNull(), // broad neighborhood — always visible
    venueName: text("venue_name").notNull(), // exact venue — accepted members only
    venueAddress: text("venue_address").notNull(),
    capacity: integer("capacity").notNull(),
    groupFormat: text("group_format", { enum: ["one_on_one", "small_group"] })
      .notNull()
      .default("small_group"),
    visibility: text("visibility", {
      enum: ["public", "recommended_only", "invite_only"],
    })
      .notNull()
      .default("public"),
    approvalMode: text("approval_mode", { enum: ["approval", "open"] })
      .notNull()
      .default("approval"),
    requestDeadline: integer("request_deadline").notNull(),
    status: text("status", {
      enum: ["draft", "published", "full", "completed", "cancelled"],
    })
      .notNull()
      .default("draft"),
    hostPrompt: text("host_prompt")
      .notNull()
      .default("What makes this outing appealing to you today?"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    statusIdx: index("outings_status_idx").on(t.status, t.startsAt),
    hostIdx: index("outings_host_idx").on(t.hostId),
  })
);

export const outingPreferences = sqliteTable("outing_preferences", {
  outingId: text("outing_id").primaryKey(),
  budgetBand: text("budget_band", {
    enum: ["free", "under_20", "20_50", "over_50"],
  }).notNull(),
  energyLevel: text("energy_level", { enum: ["calm", "balanced", "lively"] })
    .notNull()
    .default("balanced"),
  conversationDepth: text("conversation_depth", {
    enum: ["light", "mixed", "deep"],
  })
    .notNull()
    .default("mixed"),
  structured: integer("structured", { mode: "boolean" }).notNull().default(false),
  alcoholFree: integer("alcohol_free", { mode: "boolean" }).notNull().default(false),
  indoor: integer("indoor", { mode: "boolean" }).notNull().default(true),
  wheelchairAccessible: integer("wheelchair_accessible", { mode: "boolean" })
    .notNull()
    .default(false),
  languages: text("languages", { mode: "json" }).$type<string[]>().notNull(),
  firstTimerFriendly: integer("first_timer_friendly", { mode: "boolean" })
    .notNull()
    .default(true),
  minFitBand: text("min_fit_band", {
    enum: ["none", "worth_exploring", "promising", "strong"],
  })
    .notNull()
    .default("none"),
});

export const joinRequests = sqliteTable(
  "join_requests",
  {
    id: text("id").primaryKey(),
    outingId: text("outing_id").notNull(),
    requesterId: text("requester_id").notNull(),
    note: text("note").notNull(),
    status: text("status", {
      enum: ["pending", "accepted", "declined", "withdrawn", "closed"],
    })
      .notNull()
      .default("pending"),
    fitJson: text("fit_json", { mode: "json" })
      .$type<import("@/lib/matching/types").MatchExplanation | null>(),
    createdAt: integer("created_at").notNull(),
    decidedAt: integer("decided_at"),
  },
  (t) => ({
    outingIdx: index("join_requests_outing_idx").on(t.outingId, t.status),
    requesterIdx: index("join_requests_requester_idx").on(t.requesterId),
  })
);

export const outingMembers = sqliteTable(
  "outing_members",
  {
    outingId: text("outing_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["host", "attendee"] }).notNull(),
    attendanceStatus: text("attendance_status", {
      enum: ["confirmed", "attended", "no_show", "withdrawn", "removed", "cancelled"],
    })
      .notNull()
      .default("confirmed"),
    joinedAt: integer("joined_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.outingId, t.userId] }) })
);

// ---------------------------------------------------------------- messaging

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["outing", "direct"] }).notNull(),
  outingId: text("outing_id"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  createdAt: integer("created_at").notNull(),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    senderId: text("sender_id").notNull(), // "system" for system notices
    body: text("body").notNull(),
    moderationState: text("moderation_state", {
      enum: ["clear", "flagged", "removed"],
    })
      .notNull()
      .default("clear"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ convIdx: index("messages_conv_idx").on(t.conversationId, t.createdAt) })
);

// ----------------------------------------------------- feedback & learning

export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    outingId: text("outing_id").notNull(),
    authorId: text("author_id").notNull(),
    subjectId: text("subject_id"), // optional per-person signal
    attended: integer("attended", { mode: "boolean" }).notNull(),
    comfort: integer("comfort").notNull(), // 1..5, private
    connection: integer("connection").notNull(), // 1..5, private
    futureIntent: text("future_intent", {
      enum: ["would_meet_again", "maybe", "not_a_fit"],
    }).notNull(),
    privateText: text("private_text").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ outingIdx: index("feedback_outing_idx").on(t.outingId, t.authorId) })
);

export const recommendationEvents = sqliteTable(
  "recommendation_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    eventType: text("event_type").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ userIdx: index("rec_events_user_idx").on(t.userId, t.createdAt) })
);

// ------------------------------------------------------------ trust & safety

export const blocks = sqliteTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.blockerId, t.blockedId] }) })
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    subjectType: text("subject_type", {
      enum: ["user", "outing", "message"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    category: text("category").notNull(),
    details: text("details").notNull().default(""),
    status: text("status", {
      enum: ["open", "reviewing", "resolved", "dismissed"],
    })
      .notNull()
      .default("open"),
    severity: text("severity", { enum: ["low", "medium", "high", "critical"] })
      .notNull()
      .default("medium"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ statusIdx: index("reports_status_idx").on(t.status, t.severity) })
);

// ------------------------------------------------------------- notifications

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload_json", { mode: "json" })
      .$type<{ title: string; body: string; href?: string }>()
      .notNull(),
    sentAt: integer("sent_at").notNull(),
    readAt: integer("read_at"),
  },
  (t) => ({ userIdx: index("notifications_user_idx").on(t.userId, t.sentAt) })
);

// --------------------------------------------------------- saved possibilities

export const savedItems = sqliteTable(
  "saved_items",
  {
    userId: text("user_id").notNull(),
    objectType: text("object_type", { enum: ["person", "outing"] }).notNull(),
    objectId: text("object_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.objectType, t.objectId] }) })
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Outing = typeof outings.$inferSelect;
export type OutingPreference = typeof outingPreferences.$inferSelect;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type OutingMember = typeof outingMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type DnaSummary = typeof dnaSummaries.$inferSelect;
export type DnaVector = typeof dnaVectors.$inferSelect;
export type MatchRecommendation = typeof matchRecommendations.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Report = typeof reports.$inferSelect;
