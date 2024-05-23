import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";

import { user, sandbox, usersToSandboxes } from "./schema";
import * as schema from "./schema";
import { and, eq, sql } from "drizzle-orm";

export interface Env {
	DB: D1Database;
	STORAGE: any;
}

// https://github.com/drizzle-team/drizzle-orm/tree/main/examples/cloudflare-d1

// npm run generate
// npx wrangler d1 execute d1-sandbox --local --file=./drizzle/<FILE>

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const success = new Response("Success", { status: 200 });
		const invalidRequest = new Response("Invalid Request", { status: 400 });
		const notFound = new Response("Not Found", { status: 404 });
		const methodNotAllowed = new Response("Method Not Allowed", { status: 405 });

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		const db = drizzle(env.DB, { schema });

		if (path === "/api/sandbox") {
			if (method === "GET") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.sandbox.findFirst({
						where: (sandbox, { eq }) => eq(sandbox.id, id),
						with: {
							usersToSandboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(sandbox).all();
					return json(res ?? {});
				}
			} else if (method === "DELETE") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					await db.delete(usersToSandboxes).where(eq(usersToSandboxes.sandboxId, id));
					await db.delete(sandbox).where(eq(sandbox.id, id));
					return success;
				} else {
					return invalidRequest;
				}
			} else if (method === "POST") {
				const initSchema = z.object({
					id: z.string(),
					name: z.string().optional(),
					visibility: z.enum(["public", "private"]).optional(),
				});

				const body = await request.json();
				const { id, name, visibility } = initSchema.parse(body);
				const sb = await db.update(sandbox).set({ name, visibility }).where(eq(sandbox.id, id)).returning().get();

				return success;
			} else if (method === "PUT") {
				const initSchema = z.object({
					type: z.enum(["react", "node"]),
					name: z.string(),
					userId: z.string(),
					visibility: z.enum(["public", "private"]),
				});

				const body = await request.json();
				const { type, name, userId, visibility } = initSchema.parse(body);

				const allSandboxes = await db.select().from(sandbox).all();
				if (allSandboxes.length >= 8) {
					return new Response("You reached the maximum # of sandboxes.", { status: 400 });
				}

				const sb = await db.insert(sandbox).values({ type, name, userId, visibility }).returning().get();

				const initStorageRequest = new Request("https://storage.ishaan1013.workers.dev/api/init", {
					method: "POST",
					body: JSON.stringify({ sandboxId: sb.id, type }),
					headers: { "Content-Type": "application/json" },
				});
				const initStorageRes = await env.STORAGE.fetch(initStorageRequest);

				const initStorage = await initStorageRes.text();

				return new Response(sb.id, { status: 200 });
			} else {
				return methodNotAllowed;
			}
		} else if (path === "/api/sandbox/share") {
			if (method === "GET") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.usersToSandboxes.findMany({
						where: (uts, { eq }) => eq(uts.userId, id),
					});

					const owners = await Promise.all(
						res.map(async (r) => {
							const sb = await db.query.sandbox.findFirst({
								where: (sandbox, { eq }) => eq(sandbox.id, r.sandboxId),
								with: {
									author: true,
								},
							});
							if (!sb) return;
							return { id: sb.id, name: sb.name, type: sb.type, author: sb.author.name, sharedOn: r.sharedOn };
						})
					);

					return json(owners ?? {});
				} else return invalidRequest;
			} else if (method === "POST") {
				const shareSchema = z.object({
					sandboxId: z.string(),
					email: z.string(),
				});

				const body = await request.json();
				const { sandboxId, email } = shareSchema.parse(body);

				const user = await db.query.user.findFirst({
					where: (user, { eq }) => eq(user.email, email),
					with: {
						sandbox: true,
						usersToSandboxes: true,
					},
				});

				if (!user) {
					return new Response("No user associated with email.", { status: 400 });
				}

				if (user.sandbox.find((sb) => sb.id === sandboxId)) {
					return new Response("Cannot share with yourself!", { status: 400 });
				}

				if (user.usersToSandboxes.find((uts) => uts.sandboxId === sandboxId)) {
					return new Response("User already has access.", { status: 400 });
				}

				await db.insert(usersToSandboxes).values({ userId: user.id, sandboxId, sharedOn: new Date() }).get();

				return success;
			} else if (method === "DELETE") {
				const deleteShareSchema = z.object({
					sandboxId: z.string(),
					userId: z.string(),
				});

				const body = await request.json();
				const { sandboxId, userId } = deleteShareSchema.parse(body);

				await db.delete(usersToSandboxes).where(and(eq(usersToSandboxes.userId, userId), eq(usersToSandboxes.sandboxId, sandboxId)));

				return success;
			} else return methodNotAllowed;
		} else if (path === "/api/sandbox/generate" && method === "POST") {
			const generateSchema = z.object({
				userId: z.string(),
			});
			const body = await request.json();
			const { userId } = generateSchema.parse(body);

			const dbUser = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, userId),
			});
			if (!dbUser) {
				return new Response("User not found.", { status: 400 });
			}
			if (dbUser.generations !== null && dbUser.generations >= 10) {
				return new Response("You reached the maximum # of generations.", { status: 400 });
			}

			await db
				.update(user)
				.set({ generations: sql`${user.generations} + 1` })
				.where(eq(user.id, userId))
				.get();

			return success;
		} else if (path === "/api/user") {
			if (method === "GET") {
				const params = url.searchParams;

				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.user.findFirst({
						where: (user, { eq }) => eq(user.id, id),
						with: {
							sandbox: true,
							usersToSandboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(user).all();
					return json(res ?? {});
				}
			} else if (method === "POST") {
				const userSchema = z.object({
					id: z.string(),
					name: z.string(),
					email: z.string().email(),
				});

				const body = await request.json();
				const { id, name, email } = userSchema.parse(body);

				const res = await db.insert(user).values({ id, name, email }).returning().get();
				return json({ res });
			} else if (method === "DELETE") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					await db.delete(user).where(eq(user.id, id));
					return success;
				} else return invalidRequest;
			} else {
				return methodNotAllowed;
			}
		} else return notFound;
	},
};
