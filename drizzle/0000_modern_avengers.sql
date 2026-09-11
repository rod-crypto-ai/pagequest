CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`assigned_by` text NOT NULL,
	`student_id` text,
	`class_id` text,
	`available_at` integer NOT NULL,
	`due_at` integer,
	`attempt_limit` integer DEFAULT 1 NOT NULL,
	`passing_score` integer DEFAULT 70 NOT NULL,
	`review_mode` text DEFAULT 'score_only' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assignments_student_available` ON `assignments` (`student_id`,`available_at`);--> statement-breakpoint
CREATE INDEX `idx_assignments_class_available` ON `assignments` (`class_id`,`available_at`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`quiz_version` integer NOT NULL,
	`answers_json` text NOT NULL,
	`score_percent` integer NOT NULL,
	`points_earned` real NOT NULL,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_user_submitted` ON `attempts` (`user_id`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `idx_attempts_quiz_id` ON `attempts` (`quiz_id`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`isbn10` text,
	`isbn13` text,
	`open_library_id` text,
	`google_books_id` text,
	`title` text NOT NULL,
	`authors_json` text NOT NULL,
	`cover_url` text,
	`publication_year` integer,
	`page_count` integer,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_books_isbn13` ON `books` (`isbn13`);--> statement-breakpoint
CREATE INDEX `idx_books_open_library_id` ON `books` (`open_library_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_type` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`target_points` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_goals_user_period` ON `goals` (`user_id`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`position` integer NOT NULL,
	`prompt` text NOT NULL,
	`choices_json` text NOT NULL,
	`correct_index` integer NOT NULL,
	`skill` text NOT NULL,
	`rationale` text NOT NULL,
	`source_reference` text NOT NULL,
	`confidence` real NOT NULL,
	`visual_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_questions_quiz_position` ON `questions` (`quiz_id`,`position`);--> statement-breakpoint
CREATE TABLE `quiz_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`source_type` text NOT NULL,
	`content_hash` text NOT NULL,
	`sufficiency_status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_quiz_sources_book_org` ON `quiz_sources` (`book_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`source_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`grade_band` text NOT NULL,
	`model` text,
	`prompt_version` text,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `quiz_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quizzes_org_book_version` ON `quizzes` (`organization_id`,`book_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_quizzes_org_status` ON `quizzes` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reward_type` text NOT NULL,
	`reward_key` text NOT NULL,
	`earned_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rewards_user_key` ON `rewards` (`user_id`,`reward_key`);--> statement-breakpoint
CREATE TABLE `student_guardian_links` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`guardian_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`consent_recorded_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guardian_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_guardian_pair` ON `student_guardian_links` (`student_id`,`guardian_id`);--> statement-breakpoint
CREATE INDEX `idx_guardian_links_guardian` ON `student_guardian_links` (`guardian_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_users_organization_id` ON `users` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_organization_email` ON `users` (`organization_id`,`email`);--> statement-breakpoint
PRAGMA optimize;
