import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";

import { user, sandbox, usersToSandboxes } from "./schema";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

export interface Env {
	DB: D1Database;
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
					const res = await db.delete(sandbox).where(eq(sandbox.id, id)).get();
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

				const sb = await db.insert(sandbox).values({ type, name, userId, visibility }).returning().get();

				// console.log("sb:", sb);
				await fetch("https://storage.ishaan1013.workers.dev/api/init", {
					method: "POST",
					body: JSON.stringify({ sandboxId: sb.id, type }),
					headers: { "Content-Type": "application/json" },
				});

				return new Response(sb.id, { status: 200 });
			} else {
				console.log(method);
				return methodNotAllowed;
			}
		} else if (path === "/api/sandbox/share" && method === "POST") {
			const shareSchema = z.object({
				sandboxId: z.string(),
				email: z.string(),
			});

			const body = await request.json();
			const { sandboxId, email } = shareSchema.parse(body);

			const user = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.email, email),
			});

			if (!user) return invalidRequest;

			await db.insert(usersToSandboxes).values({ userId: user.id, sandboxId }).get();

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
			} else {
				return methodNotAllowed;
			}
		} else return notFound;
	},
};
