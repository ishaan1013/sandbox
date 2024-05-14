export interface Env {
	AI: any;
	KEY: string;
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}
		// if (request.headers.get('Authorization') !== env.KEY) {
		// 	return new Response('Unauthorized', { status: 401 });
		// }

		const url = new URL(request.url);
		const fileName = url.searchParams.get('fileName');
		const instructions = url.searchParams.get('instructions');
		const line = url.searchParams.get('line');
		const code = url.searchParams.get('code');

		const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
			messages: [
				{
					role: 'system',
					content:
						'You are an expert coding assistant. You read code from a file, and you suggest new code to add to the file. You may be given instructions on what to generate, which you should follow. You should generate code that is correct, efficient, and follows best practices. You should also generate code that is clear and easy to read. When you generate code, you should only return the code, and nothing else. You should not include backticks in the code you generate.',
				},
				{
					role: 'user',
					content: `The file is called ${fileName}.`,
				},
				{
					role: 'user',
					content: `Here are my instructions on what to generate: ${instructions}.`,
				},
				{
					role: 'user',
					content: `Suggest me code to insert at line ${line} in my file. Give only the code, and NOTHING else. DO NOT include backticks in your response. My code file content is as follows 
          
${code}`,
				},
			],
		});

		return new Response(JSON.stringify(response));
	},
} satisfies ExportedHandler<Env>;
