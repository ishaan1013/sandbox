import { Anthropic } from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    // const fileName = url.searchParams.get("fileName");
    // const line = url.searchParams.get("line");
    const instructions = url.searchParams.get("instructions");
    const code = url.searchParams.get("code");

    const prompt = `
Make the following changes to the code below:
- ${instructions}

Return the complete code chunk. Do not refer to other code files. Do not add code before or after the chunk. Start your reponse with \`\`\`, and end with \`\`\`. Do not include any other text.

\`\`\`
${code}
\`\`\`
`;
console.log(prompt);

    try {
      const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

      interface TextBlock {
        type: "text";
        text: string;
      }

      interface ToolUseBlock {
        type: "tool_use";
        tool_use: {
          // Add properties if needed
        };
      }

      type ContentBlock = TextBlock | ToolUseBlock;

      function getTextContent(content: ContentBlock[]): string {
        for (const block of content) {
          if (block.type === "text") {
            return block.text;
          }
        }
        return "No text content found";
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const message = response.content as ContentBlock[];
      const textBlockContent = getTextContent(message);

      const pattern = /```[a-zA-Z]*\n([\s\S]*?)\n```/;
      const match = textBlockContent.match(pattern);

      const codeContent = match ? match[1] : "Error: Could not extract code.";

      return new Response(JSON.stringify({ "response": codeContent }))
    } catch (error) {
      console.error("Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
