import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm/expressions";
import type { IRequest, Route } from "itty-router";
import { Router } from "itty-router";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";

import { user, sandbox } from "./schema";

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		const db = drizzle(env.DB);

		if (path === "/api/user" && method === "GET") {
			const params = url.searchParams;

			if (params.has("id")) {
				const id = params.get("id") as string;
				const res = await db.select().from(user).where(eq(user.id, id)).get();
				return json(res ?? {});
			} else {
				const res = await db.select().from(user).all();
				return new Response(JSON.stringify(res));
			}
		} else return new Response("Not Found", { status: 404 });
	},
};
