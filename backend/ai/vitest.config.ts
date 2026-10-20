import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    deps: {
      optimizer: { ssr: { enabled: true, include: ["ajv", "ajv-formats"] } },
    },
    poolOptions: {
      workers: {
        // Unit tests supply their own AI binding and intercept MCP at the HTTP boundary.
        miniflare: {
          compatibilityDate: "2024-05-12",
          compatibilityFlags: ["nodejs_compat"],
        },
      },
    },
  },
});
