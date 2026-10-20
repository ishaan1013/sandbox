import { randomUUID } from "crypto";
import type { Socket } from "socket.io";
import { z } from "zod";

export type GenerationResult = {
  success: boolean;
  response?: string;
  sources?: { url: string; title?: string }[];
  error?: string;
};

const optionsSchema = z.object({
  webSearch: z.boolean().optional(),
  searchSessionId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
});

type GenerationOptions = z.infer<typeof optionsSchema>;
type GenerationCallback = (result: GenerationResult) => void;

/** Register one authenticated socket's code generation and cancellation handlers. */
export function registerCodeGeneration(
  socket: Pick<Socket, "on">,
  data: { userId: string }
) {
  const pending = new Map<string, AbortController>();

  socket.on(
    "generateCode",
    async (
      fileName: string,
      code: string,
      line: number,
      instructions: string,
      optionsOrCallback: GenerationOptions | GenerationCallback,
      suppliedCallback?: GenerationCallback
    ) => {
      // Keep the original five-argument client protocol working.
      const callback =
        typeof optionsOrCallback === "function"
          ? optionsOrCallback
          : suppliedCallback;
      if (typeof callback !== "function") return;

      const parsed = optionsSchema.safeParse(
        typeof optionsOrCallback === "function" ? {} : optionsOrCallback
      );
      if (
        !parsed.success ||
        typeof fileName !== "string" ||
        typeof code !== "string" ||
        typeof instructions !== "string" ||
        !Number.isInteger(line) ||
        line < 0
      ) {
        callback({ success: false, error: "Invalid generation request." });
        return;
      }

      const options = parsed.data;
      const requestId = options.requestId ?? randomUUID();
      if (pending.has(requestId)) {
        callback({ success: false, error: "This generation is already running." });
        return;
      }
      const controller = new AbortController();
      pending.set(requestId, controller);
      const timeout = setTimeout(() => controller.abort(), 60_000);

      try {
        // Check the existing generation allowance before making external requests.
        const allowance = await fetch(
          `${process.env.DATABASE_WORKER_URL}/api/sandbox/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `${process.env.WORKERS_KEY}`,
            },
            body: JSON.stringify({ userId: data.userId }),
            signal: controller.signal,
          }
        );
        if (!allowance.ok) {
          callback({
            success: false,
            error: "Code generation is unavailable. Check your generation allowance.",
          });
          return;
        }

        const url = new URL(`${process.env.AI_WORKER_URL}/api`);
        url.search = new URLSearchParams({
          fileName,
          code,
          line: String(line),
          instructions,
          webSearch: String(options.webSearch !== false),
          // Legacy clients make standalone generation requests.
          searchSessionId: options.searchSessionId ?? randomUUID(),
        }).toString();

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.CF_AI_KEY}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Generation worker rejected the request.");
        const json = await response.json();
        if (controller.signal.aborted) throw new Error("Generation cancelled.");
        if (typeof json.response !== "string" || !json.response.trim()) {
          throw new Error("Generation worker did not return code.");
        }
        callback({
          success: true,
          response: json.response,
          sources: Array.isArray(json.sources) ? json.sources : [],
        });
      } catch {
        // Provider responses can contain sensitive prompt or infrastructure data.
        callback({
          success: false,
          error: controller.signal.aborted
            ? "Code generation was cancelled or timed out."
            : "Code generation failed. Try again, or turn off web references.",
        });
      } finally {
        clearTimeout(timeout);
        pending.delete(requestId);
      }
    }
  );

  socket.on("cancelGeneration", (requestId: string) => {
    pending.get(requestId)?.abort();
  });
  socket.on("disconnect", () => {
    for (const controller of pending.values()) controller.abort();
  });
}
