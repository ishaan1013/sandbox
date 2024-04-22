CREATE TABLE `sandbox` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`text` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_id_unique` ON `sandbox` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);