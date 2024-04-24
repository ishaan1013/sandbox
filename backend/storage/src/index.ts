import { z } from 'zod';
import startercode from './startercode';

export interface Env {
	R2: R2Bucket;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const success = new Response('Success', { status: 200 });
		const notFound = new Response('Not Found', { status: 404 });
		const methodNotAllowed = new Response('Method Not Allowed', { status: 405 });

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		if (path === '/api/init' && method === 'POST') {
			const initSchema = z.object({
				sandboxId: z.string(),
				type: z.enum(['react', 'node']),
			});

			const body = await request.json();
			const { sandboxId, type } = initSchema.parse(body);

			console.log(startercode[type]);

			await Promise.all(
				startercode[type].map(async (file) => {
					await env.R2.put(`projects/${sandboxId}/${file.name}`, file.body);
				})
			);

			return success;
		} else {
			return notFound;
		}
	},
};
