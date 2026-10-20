import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker"
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"
import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js"

export const SEARCH_ENDPOINT = "https://search.parallel.ai/mcp"
export const SEARCH_USER_AGENT = "Sandbox/0.1.0 (https://github.com/ishaan1013/sandbox)"
export const MODEL = "@cf/meta/llama-3-8b-instruct"
const SEARCH_TIMEOUT_MS = 15_000
const MAX_CONTEXT_CHARS = 12_000

export interface WebSource {
	url: string
	title?: string
}

// Treat source pages as untrusted reference data, never as instructions.
export async function getWebContext(prompt: string, sessionId: string, signal: AbortSignal) {
	const controller = new AbortController()
	const abort = () => controller.abort()
	if (signal.aborted) controller.abort()
	else signal.addEventListener("abort", abort, { once: true })
	const timer = setTimeout(abort, SEARCH_TIMEOUT_MS)
	const cleanups: (() => void)[] = []
	const client = new Client({ name: "sandbox", version: "0.1.0" }, {
		jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
	})
	const transport = new StreamableHTTPClientTransport(new URL(SEARCH_ENDPOINT), {
		requestInit: { headers: { "User-Agent": SEARCH_USER_AGENT }, redirect: "error" },
		// Include cancellation in discovery as well as tool calls. Never load ambient keys.
		fetch: async (url, init) => {
			const local = new AbortController()
			const cancel = () => local.abort()
			const other = init?.signal
			if (controller.signal.aborted || other?.aborted) local.abort()
			controller.signal.addEventListener("abort", cancel, { once: true })
			other?.addEventListener("abort", cancel, { once: true })
			// Keep these listeners through response-body consumption, including SSE.
			cleanups.push(() => {
				controller.signal.removeEventListener("abort", cancel)
				other?.removeEventListener("abort", cancel)
			})
			// Workers and the SDK's DOM types add different platform fields to Response.
			return await fetch(url, { ...init, signal: local.signal }) as unknown as Awaited<ReturnType<FetchLike>>
		},
	})
	const options = { signal: controller.signal, timeout: SEARCH_TIMEOUT_MS }
	try {
		await client.connect(transport, options)
		const { tools } = await client.listTools({}, options)
		const urls = [...prompt.matchAll(/https?:\/\/[^\s<>"`]+/g)]
			.map(([url]) => url.replace(/[),.;]+$/, ""))
			.filter((url) => {
				try { const parsed = new URL(url); return !parsed.username && !parsed.password }
				catch { return false }
			})
			.slice(0, 3)
		const name = urls.length ? "web_fetch" : "web_search"
		if (!tools.some((tool) => tool.name === name)) throw new Error("Missing web reference tool")
		const args = urls.length
			? { urls, objective: prompt.slice(0, 200), session_id: sessionId, model_name: MODEL }
			: {
				objective: `Find current official API and framework documentation for this coding task: ${prompt}`,
				search_queries: [prompt],
				session_id: sessionId,
				model_name: MODEL,
			}
		const result = CallToolResultSchema.parse(await client.callTool({ name, arguments: args }, undefined, options))
		if (result.isError) throw new Error("Web reference tool failed")
		let data: unknown = result.structuredContent
		if (!data) {
			const text = result.content.find((block) => block.type === "text")
			if (!text || text.type !== "text") throw new Error("Missing web references")
			data = JSON.parse(text.text)
		}
		if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
			throw new Error("Invalid web references")
		}
		// Only structured page excerpts enter the model prompt, never protocol diagnostics.
		const sources: WebSource[] = []
		let context = ""
		for (const row of data.results.slice(0, 5)) {
			if (!row || typeof row.url !== "string" || !Array.isArray(row.excerpts) ||
				!row.excerpts.every((text: unknown) => typeof text === "string")) throw new Error("Invalid web reference")
			const url = new URL(row.url)
			if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) continue
			const title = typeof row.title === "string" ? row.title.slice(0, 200) : undefined
			const excerpt = row.excerpts.join("\n").slice(0, 3_000)
			if (!excerpt.trim() || context.length >= MAX_CONTEXT_CHARS) continue
			context += `\nSource: ${url.href}\n${excerpt}\n`.slice(0, MAX_CONTEXT_CHARS - context.length)
			sources.push({ url: url.href, title })
		}
		if (!sources.length) throw new Error("No web references found")
		return { context, sources }
	} finally {
		controller.abort()
		clearTimeout(timer)
		signal.removeEventListener("abort", abort)
		await client.close()
		for (const cleanup of cleanups) cleanup()
	}
}
