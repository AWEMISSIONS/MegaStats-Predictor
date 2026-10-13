CREATE TABLE `draws` (
	`draw_date` text PRIMARY KEY NOT NULL,
	`white_numbers` text NOT NULL,
	`mega_ball` integer NOT NULL,
	`source` text DEFAULT 'NY Open Data' NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forecasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`model` text NOT NULL,
	`white_numbers` text NOT NULL,
	`mega_ball` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` text NOT NULL,
	`weight_snapshot` text NOT NULL,
	`white_hits` integer,
	`mega_hit` integer,
	`evaluated_at` text
);
