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

interface Request extends IRequest {
	db: DrizzleD1Database;
}

interface Methods {
	get: Route;
	post: Route;
}

async function injectDB(request: Request, env: Env) {
	const db = drizzle(env.DB);
	request.db = db;
}

const router = Router<Request>({ base: "/" });

router.get("/user", injectDB, async (req: Request, env: Env) => {
	const res = await req.db.select().from(user).all();
	return json(res);
});

router.get("/user/:id", injectDB, async (req: Request, env: Env) => {
	const res = await req.db.select().from(user).where(eq(user.id, req.params!["id"])).get();
	return json(res ?? {});
});

router.post("/user", injectDB, async (req: Request, env: Env) => {
	const userSchema = z.object({
		name: z.string(),
		email: z.string().email(),
	});

	const reqJSON = await req.json!();
	const { name, email } = userSchema.parse(reqJSON);

	const res = await req.db.insert(user).values({ name, email }).returning().get();
	return json({ res });
});

export default {
	fetch: router.handle,
};
