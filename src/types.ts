export interface ModelConfig {
  name: string;
  apiKey?: string;
  apiUrl?: string;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: { url: string };
}

export interface AudioContent {
  type: "audio";
  audio: { url: string };
}

export type ContentPart = TextContent | ImageContent | AudioContent;

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "function" | "tool";
  content: string | ContentPart[];
  name?: string;
  function_call?: any;
  tool_calls?: any;
}

export interface RequestBody {
  messages: ChatMessage[];
  fastModel?: string | ModelConfig;
  slowModel?: string | ModelConfig;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  // Add other OpenAI params as needed
}

export interface ValidationError {
  message: string;
  field?: string;
}
