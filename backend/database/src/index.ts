import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm/expressions";
import type { IRequest, Route } from "itty-router";
import { Router } from "itty-router";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";

import { user, sandbox } from "./schema";
import * as schema from "./schema";

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		const db = drizzle(env.DB, { schema });

		if (path.startsWith("/api/user")) {
			if (path === "/api/user") {
				if (method === "GET") {
					const params = url.searchParams;

					if (params.has("id")) {
						const id = params.get("id") as string;
						const res = await db.select().from(user).where(eq(user.id, id)).get();
						console.log(res);
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
					return new Response("Method Not Allowed", { status: 405 });
				}
			} else if (path === "/api/user/sandbox") {
				const params = url.searchParams;
				if (method === "GET" && params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.user.findFirst({
						where: (user, { eq }) => eq(user.id, id),
						with: {
							sandbox: true,
						},
					});
					return json(res ?? {});
				} else {
					return new Response("Method Not Allowed", { status: 405 });
				}
			} else {
				return new Response("Not Found", { status: 404 });
			}
		} else return new Response("Not Found", { status: 404 });
	},
};
