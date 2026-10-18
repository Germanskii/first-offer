CREATE TABLE `strategy_backups` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL
);
