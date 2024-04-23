const success = new Response('Success', { status: 200 });
const notFound = new Response('Not Found', { status: 404 });
const methodNotAllowed = new Response('Method Not Allowed', { status: 405 });

export interface Env {
	DB: D1Database;
	R2: R2Bucket;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext // : Promise<Response>
	) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		if (method === 'GET') {
		}
	},
};
