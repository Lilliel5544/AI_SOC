CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`raw` text NOT NULL,
	`workflow_status` text DEFAULT 'new' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_created_at` ON `alerts` (`created_at`);