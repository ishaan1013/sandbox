import { z } from "zod"
import startercode from "./startercode"

export interface Env {
	R2: R2Bucket
	KEY: string
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const success = new Response("Success", { status: 200 })
		const invalidRequest = new Response("Invalid Request", { status: 400 })
		const notFound = new Response("Not Found", { status: 404 })
		const methodNotAllowed = new Response("Method Not Allowed", { status: 405 })

		if (request.headers.get("Authorization") !== env.KEY) {
			return new Response("Unauthorized", { status: 401 })
		}

		const url = new URL(request.url)
		const path = url.pathname
		const method = request.method

		if (path === "/api/project" && method === "DELETE") {
			const deleteSchema = z.object({
				sandboxId: z.string(),
			})

			const body = await request.json()
			const { sandboxId } = deleteSchema.parse(body)

			const res = await env.R2.list({ prefix: "projects/" + sandboxId })
			// delete all files
			await Promise.all(
				res.objects.map(async (file) => {
					await env.R2.delete(file.key)
				})
			)

			return success
		} else if (path === "/api/size" && method === "GET") {
			const params = url.searchParams
			const sandboxId = params.get("sandboxId")

			if (sandboxId) {
				const res = await env.R2.list({ prefix: `projects/${sandboxId}` })

				// sum up the size of all files
				let size = 0
				for (const file of res.objects) {
					size += file.size
				}

				return new Response(JSON.stringify({ size }), { status: 200 })
			} else return invalidRequest
		} else if (path === "/api") {
			if (method === "GET") {
				const params = url.searchParams
				const sandboxId = params.get("sandboxId")
				const folderId = params.get("folderId")
				const fileId = params.get("fileId")

				if (sandboxId) {
					const res = await env.R2.list({ prefix: `projects/${sandboxId}` })
					return new Response(JSON.stringify(res), { status: 200 })
				} else if (folderId) {
					const res = await env.R2.list({ prefix: folderId })
					return new Response(JSON.stringify(res), { status: 200 })
				} else if (fileId) {
					const obj = await env.R2.get(fileId)
					if (obj === null) {
						return new Response(`${fileId} not found`, { status: 404 })
					}
					const headers = new Headers()
					headers.set("etag", obj.httpEtag)
					obj.writeHttpMetadata(headers)

					const text = await obj.text()

					return new Response(text, {
						headers,
					})
				} else return invalidRequest
			} else if (method === "POST") {
				const createSchema = z.object({
					fileId: z.string(),
				})

				const body = await request.json()
				const { fileId } = createSchema.parse(body)

				await env.R2.put(fileId, "")

				return success
			} else if (method === "DELETE") {
				const deleteSchema = z.object({
					fileId: z.string(),
				})

				const body = await request.json()
				const { fileId } = deleteSchema.parse(body)

				await env.R2.delete(fileId)

				return success
			} else return methodNotAllowed
		} else if (path === "/api/rename" && method === "POST") {
			const renameSchema = z.object({
				fileId: z.string(),
				newFileId: z.string(),
				data: z.string(),
			})

			const body = await request.json()
			const { fileId, newFileId, data } = renameSchema.parse(body)

			await env.R2.delete(fileId)
			await env.R2.put(newFileId, data)

			return success
		} else if (path === "/api/save" && method === "POST") {
			const renameSchema = z.object({
				fileId: z.string(),
				data: z.string(),
			})

			const body = await request.json()
			const { fileId, data } = renameSchema.parse(body)

			await env.R2.put(fileId, data)

			return success
		} else if (path === "/api/init" && method === "POST") {
			const initSchema = z.object({
				sandboxId: z.string(),
				type: z.string(),
			})

			const body = await request.json()
			const { sandboxId, type } = initSchema.parse(body)

			console.log(startercode[type])

			await Promise.all(
				startercode[type].map(async (file) => {
					await env.R2.put(`projects/${sandboxId}/${file.name}`, file.body)
				})
			)

			return success
		} else {
			return notFound
		}
	},
}
