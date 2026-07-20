CREATE TABLE `blocks` (
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`blocker_id`, `blocked_id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`outing_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `friendship_dna_answers` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer` text NOT NULL,
	`privacy_level` text DEFAULT 'matching_only' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`)
);
--> statement-breakpoint
CREATE TABLE `dna_summaries` (
	`user_id` text PRIMARY KEY NOT NULL,
	`headline` text NOT NULL,
	`sections` text NOT NULL,
	`model_version` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `friendship_dna_vectors` (
	`user_id` text NOT NULL,
	`dimension` text NOT NULL,
	`values` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`source_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `dimension`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`outing_id` text NOT NULL,
	`author_id` text NOT NULL,
	`subject_id` text,
	`attended` integer NOT NULL,
	`comfort` integer NOT NULL,
	`connection` integer NOT NULL,
	`future_intent` text NOT NULL,
	`private_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_outing_idx` ON `feedback` (`outing_id`,`author_id`);--> statement-breakpoint
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`outing_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`note` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`fit_json` text,
	`created_at` integer NOT NULL,
	`decided_at` integer
);
--> statement-breakpoint
CREATE INDEX `join_requests_outing_idx` ON `join_requests` (`outing_id`,`status`);--> statement-breakpoint
CREATE INDEX `join_requests_requester_idx` ON `join_requests` (`requester_id`);--> statement-breakpoint
CREATE TABLE `match_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`viewer_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`score_band` text NOT NULL,
	`score` real NOT NULL,
	`reason_json` text NOT NULL,
	`ruleset_version` text NOT NULL,
	`status` text DEFAULT 'fresh' NOT NULL,
	`week_key` text NOT NULL,
	`generated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `match_viewer_idx` ON `match_recommendations` (`viewer_id`,`week_key`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`moderation_state` text DEFAULT 'clear' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_conv_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`sent_at` integer NOT NULL,
	`read_at` integer
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `outing_members` (
	`outing_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`attendance_status` text DEFAULT 'confirmed' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`outing_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `outing_preferences` (
	`outing_id` text PRIMARY KEY NOT NULL,
	`budget_band` text NOT NULL,
	`energy_level` text DEFAULT 'balanced' NOT NULL,
	`conversation_depth` text DEFAULT 'mixed' NOT NULL,
	`structured` integer DEFAULT false NOT NULL,
	`alcohol_free` integer DEFAULT false NOT NULL,
	`indoor` integer DEFAULT true NOT NULL,
	`wheelchair_accessible` integer DEFAULT false NOT NULL,
	`languages` text NOT NULL,
	`first_timer_friendly` integer DEFAULT true NOT NULL,
	`min_fit_band` text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outings` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`title` text NOT NULL,
	`pitch` text NOT NULL,
	`category` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_mins` integer NOT NULL,
	`timezone` text DEFAULT 'Asia/Singapore' NOT NULL,
	`area` text NOT NULL,
	`venue_name` text NOT NULL,
	`venue_address` text NOT NULL,
	`capacity` integer NOT NULL,
	`group_format` text DEFAULT 'small_group' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`approval_mode` text DEFAULT 'approval' NOT NULL,
	`request_deadline` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`host_prompt` text DEFAULT 'What makes this outing appealing to you today?' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outings_status_idx` ON `outings` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `outings_host_idx` ON `outings` (`host_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`pronouns` text,
	`avatar_seed` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`friendship_feels_like` text DEFAULT '' NOT NULL,
	`languages` text NOT NULL,
	`neighborhood` text DEFAULT '' NOT NULL,
	`life_season` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'community' NOT NULL,
	`intent` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rec_events_user_idx` ON `recommendation_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`category` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`,`severity`);--> statement-breakpoint
CREATE TABLE `saved_items` (
	`user_id` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `object_type`, `object_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`birth_date` text NOT NULL,
	`city` text DEFAULT 'Singapore' NOT NULL,
	`onboarding_step` integer DEFAULT 0 NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);