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
	sandbox: many(sandbox, {
		relationName: "author",
	}),
	sharedSandbox: many(sandbox, {
		relationName: "sharedTo",
	}),
}));

export const sandbox = sqliteTable("sandbox", {
	id: text("id")
		.$defaultFn(() => createId())
		.primaryKey()
		.unique(),
	name: text("name").notNull(),
	type: text("type", { enum: ["react", "node"] }).notNull(),
	visibility: text("visibility", { enum: ["public", "private"] }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
});

export type Sandbox = typeof sandbox.$inferSelect;

export const sandboxRelations = relations(sandbox, ({ one, many }) => ({
	author: one(user, {
		fields: [sandbox.userId],
		references: [user.id],
		relationName: "sandbox",
	}),
	sharedTo: many(user, {
		relationName: "sharedSandbox",
	}),
}));

export const usersToSandboxes = sqliteTable("users_to_sandboxes", {
	userId: integer("userId")
		.notNull()
		.references(() => user.id),
	sandboxId: integer("sandboxId")
		.notNull()
		.references(() => sandbox.id),
});

export const usersToSandboxesRelations = relations(usersToSandboxes, ({ one }) => ({
	group: one(sandbox, {
		fields: [usersToSandboxes.sandboxId],
		references: [sandbox.id],
	}),
	user: one(user, {
		fields: [usersToSandboxes.userId],
		references: [user.id],
	}),
}));
