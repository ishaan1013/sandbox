import type { Config } from "drizzle-kit";

export default process.env.LOCAL_DB_PATH
	? ({
			schema: "./src/schema.ts",
			driver: "better-sqlite",
			dbCredentials: {
				url: process.env.LOCAL_DB_PATH!,
			},
	  } satisfies Config)
	: ({
			schema: "./src/schema.ts",
			out: "./drizzle",
			driver: "d1",
			dbCredentials: {
				wranglerConfigPath: "wrangler.toml",
				dbName: "d1-sandbox",
			},
	  } satisfies Config);
