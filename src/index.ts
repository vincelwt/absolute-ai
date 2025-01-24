import { Hono } from "hono";
import OpenAI from "openai";
import { cache } from "hono/cache";

import { cors } from "hono/cors";

import { logger } from "hono/logger";
import { LandingPage } from "./landing";
import type { RequestBody } from "./types";
import { RequestSchema, validateModelConfig } from "./validation";
import { shouldUseSlowModel, logModelDetermination } from "./complexityCheck";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});

openai.chat.completions.create({
  fastModel: {
    apiUrl: "https://api.openai.com/v1",  
    apiKey: process.env.OPENAI_API_KEY,
    name: "meta/llama-..."
  },
  messages: [{ role: "user", content: "What is the meaning of life?" }],
});

interface ModelConfig {
  name: string;
  apiKey?: string;
  apiUrl?: string;
}

const app = new Hono();
app.use("*", cors({ origin: "*", maxAge: 3600 * 6, credentials: true }));
app.use(logger());

app.get(
  "*",
  cache({
    cacheName: "absolute",
    cacheControl: "max-age=3600",
  })
);

app.get("/", (c) => {
  return c.html(LandingPage());
});

app.post("/v1/chat/completions", async (c) => {
  let abortController = new AbortController();
  let complexityCheckClient: OpenAI | null = null;
  let activeStream: AsyncIterable<any> | null = null;

  c.req.raw.signal.addEventListener("abort", () => {
    console.log("[Stream] Client disconnected, aborting request");
    abortController.abort();
  });

  try {
    const rawBody = await c.req.json();
    const body = (await RequestSchema.parseAsync(rawBody)) as RequestBody;
    const authHeader = c.req.header("Authorization");

    complexityCheckClient = new OpenAI({
      apiKey: authHeader?.split(" ")[1] || process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
    });

    const lastUserMessage = body.messages.findLast((m) => m.role === "user");
    const prompt = lastUserMessage?.content ?? "";

    const { useSlowModel, reason } = await shouldUseSlowModel(
      prompt,
      complexityCheckClient,
      body.messages
    );

    const getModelConfig = (
      modelParam: string | ModelConfig | undefined,
      defaultModel: string
    ): ModelConfig => {
      let config: ModelConfig;
      if (!modelParam) {
        config = { name: defaultModel };
      } else {
        config =
          typeof modelParam === "string" ? { name: modelParam } : modelParam;
      }
      const error = validateModelConfig(config);
      if (error) {
        throw new Error(
          `Invalid model configuration: ${error.message}${
            error.field ? ` (${error.field})` : ""
          }`
        );
      }
      return config;
    };

    const modelConfig = useSlowModel
      ? getModelConfig(body.slowModel, "gpt-4o-mini")
      : getModelConfig(body.fastModel, "gpt-4o");

    logModelDetermination(prompt, useSlowModel, modelConfig, reason);

    const client = new OpenAI({
      apiKey:
        modelConfig.apiKey ||
        authHeader?.split(" ")[1] ||
        process.env.OPENAI_API_KEY,
      baseURL: modelConfig.apiUrl || "https://api.openai.com/v1",
    });

    const { fastModel, slowModel, ...openaiParams } = body;

    if (body.stream) {
      const stream = await client.chat.completions.create({
        model: modelConfig.name,
        messages: body.messages,
        stream: true,
        ...openaiParams,
      });

      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                if (c.req.raw.signal.aborted) {
                  console.log("[Stream] Client disconnected, stopping stream");
                  return;
                }
                controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            } catch (error) {
              console.error("[Stream] Error during streaming:", error);
              if (!c.req.raw.signal.aborted) {
                try {
                  controller.error(error);
                } catch (e) {
                  console.error("[Stream] Failed to send error to client:", e);
                }
              }
            } finally {
              try {
                if (!c.req.raw.signal.aborted) {
                  controller.close();
                }
                console.log("[Stream] Stream completed");
              } catch (e) {
                console.error("[Stream] Error while closing stream:", e);
              }
            }
          },
          cancel() {
            console.log("[Stream] Stream cancelled by client");
            abortController.abort();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    } else {
      const completion = await client.chat.completions.create({
        messages: body.messages,
        model: modelConfig.name,
        ...openaiParams,
      });
      return c.json(completion);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[Request] Aborted by client");
      return new Response(null, { status: 499 });
    }

    console.error("Proxy error:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        400
      );
    }

    if (error instanceof SyntaxError) {
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }

    if (error instanceof Error) {
      if (error.message.includes("401")) {
        return c.json({ error: "Invalid API key" }, 401);
      }
      if (error.message.includes("404")) {
        return c.json({ error: "Model not found" }, 404);
      }
      if (error.message.includes("429")) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    }

    return c.json({ error: "Model proxy failed" }, 500);
  } finally {
    if (activeStream && "controller" in activeStream) {
      try {
        await (activeStream as any).controller.abort();
      } catch (e) {
        console.error("[Cleanup] Error aborting stream:", e);
      }
    }
  }
});

export default {
  fetch: app.fetch,
};
