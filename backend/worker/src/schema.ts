import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

export const user = sqliteTable("user", {
	id: text("id")
		.$defaultFn(() => createId())
		.primaryKey()
		.unique(),
	name: text("name").notNull(),
	email: text("email").notNull(),
});

export type User = typeof user.$inferSelect;

export const userRelations = relations(user, ({ many }) => ({
	sandbox: many(sandbox),
}));

export const sandbox = sqliteTable("sandbox", {
	id: text("id")
		.$defaultFn(() => createId())
		.primaryKey()
		.unique(),
	name: text("name").notNull(),
	type: text("type", { enum: ["react", "node"] }).notNull(),
	bucket: text("bucket"),
	init: integer("init", { mode: "boolean" }).default(false),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
});

export type Sandbox = typeof sandbox.$inferSelect;

export const sandboxRelations = relations(sandbox, ({ one }) => ({
	author: one(user, {
		fields: [sandbox.userId],
		references: [user.id],
	}),
}));
