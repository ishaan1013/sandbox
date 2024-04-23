import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";

import { user, sandbox } from "./schema";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

export interface Env {
	DB: D1Database;
}

// https://github.com/drizzle-team/drizzle-orm/tree/main/examples/cloudflare-d1

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const success = new Response("Success", { status: 200 });
		const notFound = new Response("Not Found", { status: 404 });
		const methodNotAllowed = new Response("Method Not Allowed", { status: 405 });

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		const db = drizzle(env.DB, { schema });

		// if (path === "/api/sandbox/create") {
		//   if (method === "POST") {}
		//   else return methodNotAllowed;
		// } else if (path === "/api/sandbox/init") {
		//   const params = url.searchParams;

		//   await db.update(sandbox).set({ init: true }).where(eq(sandbox.id, sandboxId));
		// } else if (path === "/api/sandbox/files") {

		// } else
		if (path === "/api/user") {
			if (method === "GET") {
				const params = url.searchParams;

				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.user.findFirst({
						where: (user, { eq }) => eq(user.id, id),
						with: {
							sandbox: true,
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
