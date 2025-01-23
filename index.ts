import { Hono } from "hono";
import OpenAI from "openai";
import { html } from "hono/html";
import { logger } from "hono/logger";
import type {
  ChatCompletionContentPart,
  ChatCompletionCreateParams,
  ChatCompletionMessage,
} from "openai/resources/chat/completions";
import { LandingPage } from "./landing";
import { z } from "zod";

interface ModelConfig {
  name: string;
  apiKey?: string;
  apiUrl?: string;
}

type ChatMessage = ChatCompletionMessage;

interface RequestBody extends Omit<ChatCompletionCreateParams, "model"> {
  messages: ChatMessage[];
  fastModel?: string | ModelConfig;
  slowModel?: string | ModelConfig;
}

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: { url: string };
}

interface AudioContent {
  type: "audio";
  audio: { url: string };
}

type ContentPart = TextContent | ImageContent | AudioContent;

interface ValidationError {
  message: string;
  field?: string;
}

// Define Zod schemas for validation
const ModelConfigSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  apiKey: z.string().optional(),
  apiUrl: z.string().url("Invalid API URL").optional(),
});

const ContentPartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({ url: z.string().url() }),
  }),
  z.object({
    type: z.literal("audio"),
    audio: z.object({ url: z.string().url() }),
  }),
]);

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "function", "tool"]),
  content: z.union([z.string(), z.array(ContentPartSchema)]),
  name: z.string().optional(),
  function_call: z.any().optional(),
  tool_calls: z.any().optional(),
});

const RequestSchema = z
  .object({
    messages: z
      .array(ChatMessageSchema)
      .min(1, "Messages array cannot be empty"),
    fastModel: z.union([z.string(), ModelConfigSchema]).optional(),
    slowModel: z.union([z.string(), ModelConfigSchema]).optional(),
    stream: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().positive().optional(),
    // Add other OpenAI params as needed
  })
  .refine(
    (data) => data.fastModel || data.slowModel || process.env.OPENAI_API_KEY,
    {
      message:
        "At least one model configuration or OPENAI_API_KEY must be provided",
    }
  );

const validateModelConfig = (config: ModelConfig): ValidationError | null => {
  if (!config.name) {
    return { message: "Model name is required", field: "name" };
  }

  if (config.apiKey && typeof config.apiKey !== "string") {
    return { message: "API key must be a string", field: "apiKey" };
  }

  if (config.apiUrl) {
    try {
      new URL(config.apiUrl);
    } catch {
      return { message: "Invalid API URL", field: "apiUrl" };
    }
  }

  return null;
};

const app = new Hono();

app.use(logger());

// Classifier implementation
const extractTextFromContent = (
  content: string | ChatCompletionContentPart[]
): string => {
  if (typeof content === "string") return content;

  return content
    .filter(
      (part): part is Extract<ChatCompletionContentPart, { type: "text" }> =>
        part.type === "text"
    )
    .map((part) => part.text)
    .join(" ");
};

// Add this constant for the complexity check prompt
const COMPLEXITY_CHECK_PROMPT = {
  role: "system" as const,
  content:
    "If the user's query requires analysis, reasoning, mathematics, knowledge, explanations, or problem solving, start your response with '==' and then continue normally. For simple queries like greetings, basic facts, or straightforward questions, respond normally without any prefix.",
};

// Update the shouldUseSlowModel function to wait for actual content
const shouldUseSlowModel = async (
  content: string | ChatCompletionContentPart[],
  client: OpenAI,
  messages: ChatMessage[]
): Promise<{ useSlowModel: boolean; reason: string }> => {
  const textContent = extractTextFromContent(content);

  // 1. Length threshold (1000 characters)
  if (textContent.length > 1000) {
    return { useSlowModel: true, reason: "length" };
  }

  // 2. Keyword detection
  const keywords = ["legal", "medical", "analysis", "philosophy"];
  if (keywords.some((keyword) => textContent.toLowerCase().includes(keyword))) {
    return { useSlowModel: true, reason: "keywords" };
  }

  // 3. Model-based complexity detection
  try {
    console.log("[Complexity Check] Starting complexity check");

    const messagesWithCheck = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Insert complexity check before the last message
    messagesWithCheck.splice(
      messagesWithCheck.length - 1,
      0,
      COMPLEXITY_CHECK_PROMPT
    );

    console.log(
      "[Complexity Check] Messages:",
      JSON.stringify(messagesWithCheck, null, 2)
    );

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messagesWithCheck,
      stream: true,
      max_tokens: 10,
    });

    // Wait for the first actual content chunk
    let foundContent = false;
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        foundContent = true;
        console.log(
          "[Complexity Check] Found content chunk:",
          JSON.stringify(content)
        );
        if (content.startsWith("==")) {
          console.log("[Complexity Check] Detected complex query marker");
          return { useSlowModel: true, reason: "model-detected" };
        }
        // Only break after we've checked the first content chunk
        break;
      }
    }

    if (!foundContent) {
      console.log("[Complexity Check] No content chunks found");
    }

    return { useSlowModel: false, reason: "model-simple" };
  } catch (error) {
    console.error("[Complexity Check] Error:", error);
    return { useSlowModel: false, reason: "check-failed" };
  }
};

// Fix the logModelDetermination function
const logModelDetermination = (
  content: string | ChatCompletionContentPart[],
  useSlowModel: boolean,
  modelConfig: ModelConfig,
  reason: string
) => {
  const textContent = extractTextFromContent(content);
  const truncatedContent =
    textContent.length > 50 ? textContent.slice(0, 50) + "..." : textContent;

  console.log(`[Model Selection] ${
    useSlowModel ? "SLOW" : "FAST"
  } model selected:
    Content: "${truncatedContent}"
    Model: ${modelConfig.name}
    Length: ${textContent.length}
    Reason: ${reason}`);
};

const getModelConfig = (
  modelParam: string | ModelConfig | undefined,
  defaultModel: string
): ModelConfig => {
  let config: ModelConfig;

  if (!modelParam) {
    config = { name: defaultModel };
  } else {
    config = typeof modelParam === "string" ? { name: modelParam } : modelParam;
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

app.get("/", (c) => {
  return c.html(LandingPage());
});

app.post("/v1/chat/completions", async (c) => {
  let abortController = new AbortController();
  let complexityCheckClient: OpenAI | null = null;
  let activeStream: AsyncIterable<any> | null = null;

  // Handle client disconnection
  c.req.raw.signal.addEventListener("abort", () => {
    console.log("[Stream] Client disconnected, aborting request");
    abortController.abort();
  });

  try {
    const rawBody = await c.req.json();
    const body = await RequestSchema.parseAsync(rawBody);
    const authHeader = c.req.header("Authorization");

    // Create initial client for complexity check
    complexityCheckClient = new OpenAI({
      apiKey: authHeader?.split(" ")[1] || process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
    });

    // Determine model configuration
    const lastUserMessage = body.messages.findLast((m) => m.role === "user");
    const prompt = lastUserMessage?.content ?? "";

    const { useSlowModel, reason } = await shouldUseSlowModel(
      prompt,
      complexityCheckClient,
      body.messages
    );

    const modelConfig = useSlowModel
      ? getModelConfig(body.slowModel, "gpt-4o-mini")
      : getModelConfig(body.fastModel, "gpt-4o");

    // Log model determination with new reason
    logModelDetermination(prompt, useSlowModel, modelConfig, reason);

    const client = new OpenAI({
      apiKey:
        modelConfig.apiKey ||
        authHeader?.split(" ")[1] ||
        process.env.OPENAI_API_KEY,
      baseURL: modelConfig.apiUrl || "https://api.openai.com/v1",
    });

    // Remove our custom parameters
    const { fastModel, slowModel, ...openaiParams } = body;

    if (body.stream) {
      const stream = await client.chat.completions.create({
        model: modelConfig.name,
        messages: body.messages as ChatCompletionCreateParams["messages"],
        stream: true,
        ...openaiParams,
      });

      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                // Check if already aborted before sending chunk
                if (c.req.raw.signal.aborted) {
                  console.log("[Stream] Client disconnected, stopping stream");
                  return; // Don't close controller, just return
                }

                controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            } catch (error) {
              console.error("[Stream] Error during streaming:", error);
              // Only try to send error if not aborted
              if (!c.req.raw.signal.aborted) {
                try {
                  controller.error(error);
                } catch (e) {
                  console.error("[Stream] Failed to send error to client:", e);
                }
              }
            } finally {
              try {
                // Only try to close if not already closed
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
        messages: body.messages as ChatCompletionCreateParams["messages"],
        model: modelConfig.name,
        ...openaiParams,
      });
      return c.json(completion);
    }
  } catch (error) {
    // If it's an abort error, return a clean response
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[Request] Aborted by client");
      return new Response(null, { status: 499 }); // Using 499 Client Closed Request
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

    // More specific error messages based on the error type
    if (error instanceof SyntaxError) {
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }

    if (error instanceof Error) {
      // Handle OpenAI API errors more gracefully
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
    // Cleanup
    if (activeStream && "controller" in activeStream) {
      try {
        await (activeStream as any).controller.abort();
      } catch (e) {
        console.error("[Cleanup] Error aborting stream:", e);
      }
    }
  }
});

const port = process.env.PORT || 3210;
console.log(`Server running on port ${port}`);
export default {
  port,
  fetch: app.fetch,
};
