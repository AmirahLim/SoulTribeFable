/**
 * Embedded copy of the SQL migrations (src/lib/db/migrations/*.sql) so the
 * schema can be created at runtime on serverless hosts, where loose .sql
 * files are not bundled. Regenerate whenever a new migration is added.
 */

export const BOOTSTRAP_STATEMENTS: string[] = [
  "CREATE TABLE `blocks` (\n\t`blocker_id` text NOT NULL,\n\t`blocked_id` text NOT NULL,\n\t`created_at` integer NOT NULL,\n\tPRIMARY KEY(`blocker_id`, `blocked_id`)\n);",
  "CREATE TABLE `conversations` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`type` text NOT NULL,\n\t`outing_id` text,\n\t`status` text DEFAULT 'open' NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE TABLE `friendship_dna_answers` (\n\t`user_id` text NOT NULL,\n\t`question_id` text NOT NULL,\n\t`answer` text NOT NULL,\n\t`privacy_level` text DEFAULT 'matching_only' NOT NULL,\n\t`updated_at` integer NOT NULL,\n\tPRIMARY KEY(`user_id`, `question_id`)\n);",
  "CREATE TABLE `dna_summaries` (\n\t`user_id` text PRIMARY KEY NOT NULL,\n\t`headline` text NOT NULL,\n\t`sections` text NOT NULL,\n\t`model_version` text NOT NULL,\n\t`updated_at` integer NOT NULL\n);",
  "CREATE TABLE `friendship_dna_vectors` (\n\t`user_id` text NOT NULL,\n\t`dimension` text NOT NULL,\n\t`values` text NOT NULL,\n\t`confidence` real DEFAULT 0.5 NOT NULL,\n\t`source_version` text NOT NULL,\n\t`updated_at` integer NOT NULL,\n\tPRIMARY KEY(`user_id`, `dimension`)\n);",
  "CREATE TABLE `feedback` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`outing_id` text NOT NULL,\n\t`author_id` text NOT NULL,\n\t`subject_id` text,\n\t`attended` integer NOT NULL,\n\t`comfort` integer NOT NULL,\n\t`connection` integer NOT NULL,\n\t`future_intent` text NOT NULL,\n\t`private_text` text DEFAULT '' NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE INDEX `feedback_outing_idx` ON `feedback` (`outing_id`,`author_id`);",
  "CREATE TABLE `join_requests` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`outing_id` text NOT NULL,\n\t`requester_id` text NOT NULL,\n\t`note` text NOT NULL,\n\t`status` text DEFAULT 'pending' NOT NULL,\n\t`fit_json` text,\n\t`created_at` integer NOT NULL,\n\t`decided_at` integer\n);",
  "CREATE INDEX `join_requests_outing_idx` ON `join_requests` (`outing_id`,`status`);",
  "CREATE INDEX `join_requests_requester_idx` ON `join_requests` (`requester_id`);",
  "CREATE TABLE `match_recommendations` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`viewer_id` text NOT NULL,\n\t`candidate_id` text NOT NULL,\n\t`score_band` text NOT NULL,\n\t`score` real NOT NULL,\n\t`reason_json` text NOT NULL,\n\t`ruleset_version` text NOT NULL,\n\t`status` text DEFAULT 'fresh' NOT NULL,\n\t`week_key` text NOT NULL,\n\t`generated_at` integer NOT NULL\n);",
  "CREATE INDEX `match_viewer_idx` ON `match_recommendations` (`viewer_id`,`week_key`);",
  "CREATE TABLE `messages` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`conversation_id` text NOT NULL,\n\t`sender_id` text NOT NULL,\n\t`body` text NOT NULL,\n\t`moderation_state` text DEFAULT 'clear' NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE INDEX `messages_conv_idx` ON `messages` (`conversation_id`,`created_at`);",
  "CREATE TABLE `notifications` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`user_id` text NOT NULL,\n\t`event_type` text NOT NULL,\n\t`payload_json` text NOT NULL,\n\t`sent_at` integer NOT NULL,\n\t`read_at` integer\n);",
  "CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`sent_at`);",
  "CREATE TABLE `outing_members` (\n\t`outing_id` text NOT NULL,\n\t`user_id` text NOT NULL,\n\t`role` text NOT NULL,\n\t`attendance_status` text DEFAULT 'confirmed' NOT NULL,\n\t`joined_at` integer NOT NULL,\n\tPRIMARY KEY(`outing_id`, `user_id`)\n);",
  "CREATE TABLE `outing_preferences` (\n\t`outing_id` text PRIMARY KEY NOT NULL,\n\t`budget_band` text NOT NULL,\n\t`energy_level` text DEFAULT 'balanced' NOT NULL,\n\t`conversation_depth` text DEFAULT 'mixed' NOT NULL,\n\t`structured` integer DEFAULT false NOT NULL,\n\t`alcohol_free` integer DEFAULT false NOT NULL,\n\t`indoor` integer DEFAULT true NOT NULL,\n\t`wheelchair_accessible` integer DEFAULT false NOT NULL,\n\t`languages` text NOT NULL,\n\t`first_timer_friendly` integer DEFAULT true NOT NULL,\n\t`min_fit_band` text DEFAULT 'none' NOT NULL\n);",
  "CREATE TABLE `outings` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`host_id` text NOT NULL,\n\t`title` text NOT NULL,\n\t`pitch` text NOT NULL,\n\t`category` text NOT NULL,\n\t`starts_at` integer NOT NULL,\n\t`duration_mins` integer NOT NULL,\n\t`timezone` text DEFAULT 'Asia/Singapore' NOT NULL,\n\t`area` text NOT NULL,\n\t`venue_name` text NOT NULL,\n\t`venue_address` text NOT NULL,\n\t`capacity` integer NOT NULL,\n\t`group_format` text DEFAULT 'small_group' NOT NULL,\n\t`visibility` text DEFAULT 'public' NOT NULL,\n\t`approval_mode` text DEFAULT 'approval' NOT NULL,\n\t`request_deadline` integer NOT NULL,\n\t`status` text DEFAULT 'draft' NOT NULL,\n\t`host_prompt` text DEFAULT 'What makes this outing appealing to you today?' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL\n);",
  "CREATE INDEX `outings_status_idx` ON `outings` (`status`,`starts_at`);",
  "CREATE INDEX `outings_host_idx` ON `outings` (`host_id`);",
  "CREATE TABLE `profiles` (\n\t`user_id` text PRIMARY KEY NOT NULL,\n\t`display_name` text NOT NULL,\n\t`pronouns` text,\n\t`avatar_seed` text NOT NULL,\n\t`bio` text DEFAULT '' NOT NULL,\n\t`friendship_feels_like` text DEFAULT '' NOT NULL,\n\t`languages` text NOT NULL,\n\t`neighborhood` text DEFAULT '' NOT NULL,\n\t`life_season` text DEFAULT '' NOT NULL,\n\t`visibility` text DEFAULT 'community' NOT NULL,\n\t`intent` text DEFAULT '' NOT NULL\n);",
  "CREATE TABLE `recommendation_events` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`user_id` text NOT NULL,\n\t`object_type` text NOT NULL,\n\t`object_id` text NOT NULL,\n\t`event_type` text NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE INDEX `rec_events_user_idx` ON `recommendation_events` (`user_id`,`created_at`);",
  "CREATE TABLE `reports` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`reporter_id` text NOT NULL,\n\t`subject_type` text NOT NULL,\n\t`subject_id` text NOT NULL,\n\t`category` text NOT NULL,\n\t`details` text DEFAULT '' NOT NULL,\n\t`status` text DEFAULT 'open' NOT NULL,\n\t`severity` text DEFAULT 'medium' NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE INDEX `reports_status_idx` ON `reports` (`status`,`severity`);",
  "CREATE TABLE `saved_items` (\n\t`user_id` text NOT NULL,\n\t`object_type` text NOT NULL,\n\t`object_id` text NOT NULL,\n\t`created_at` integer NOT NULL,\n\tPRIMARY KEY(`user_id`, `object_type`, `object_id`)\n);",
  "CREATE TABLE `sessions` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`user_id` text NOT NULL,\n\t`csrf_token` text NOT NULL,\n\t`expires_at` integer NOT NULL,\n\t`created_at` integer NOT NULL\n);",
  "CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);",
  "CREATE TABLE `users` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`email` text NOT NULL,\n\t`password_hash` text NOT NULL,\n\t`status` text DEFAULT 'active' NOT NULL,\n\t`birth_date` text NOT NULL,\n\t`city` text DEFAULT 'Singapore' NOT NULL,\n\t`onboarding_step` integer DEFAULT 0 NOT NULL,\n\t`onboarding_complete` integer DEFAULT false NOT NULL,\n\t`is_admin` integer DEFAULT false NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`last_active_at` integer NOT NULL\n);",
  "CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);",
  "ALTER TABLE `users` ADD `notification_prefs` text DEFAULT '{\"soulDrop\":true,\"requests\":true,\"reminders\":true,\"reconnect\":true}' NOT NULL;",
];
