import { z } from "zod";
import type { ContentPart, ModelConfig, ChatMessage } from "./types";

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

export const RequestSchema = z
  .object({
    messages: z
      .array(ChatMessageSchema)
      .min(1, "Messages array cannot be empty"),
    fastModel: z.union([z.string(), ModelConfigSchema]).optional(),
    slowModel: z.union([z.string(), ModelConfigSchema]).optional(),
    stream: z.boolean().optional(),
  })
  .passthrough() // Allow any additional properties
  .refine(
    (data) => data.fastModel || data.slowModel || process.env.OPENAI_API_KEY,
    {
      message:
        "At least one model configuration or OPENAI_API_KEY must be provided",
    }
  );

// Model config validator
export const validateModelConfig = (config: ModelConfig) => {
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
