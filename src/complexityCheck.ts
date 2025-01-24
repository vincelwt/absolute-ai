import chalk from "chalk";
import type OpenAI from "openai";
import type { ChatMessage, ContentPart, ModelConfig } from "./types";

// Add this constant for the complexity check prompt
export const COMPLEXITY_CHECK_PROMPT = {
  role: "system" as const,
  content:
    "If the user's query requires analysis, reasoning, mathematics, knowledge, explanations, or problem solving, start your response with '==' and then continue normally. For simple queries like greetings, basic facts, or straightforward questions, respond normally without any prefix.",
};

export function extractTextFromContent(
  content: string | ContentPart[]
): string {
  if (typeof content === "string") return content;

  return content
    .filter((part) => part.type === "text")
    .map((part: any) => part.text)
    .join(" ");
}

export async function shouldUseSlowModel(
  content: string | ContentPart[],
  client: OpenAI,
  messages: ChatMessage[]
): Promise<{ useSlowModel: boolean; reason: string }> {
  const textContent = extractTextFromContent(content);

  if (textContent.length > 1000) {
    return { useSlowModel: true, reason: "length" };
  }

  const keywords = ["legal", "medical", "analysis", "philosophy"];
  if (keywords.some((keyword) => textContent.toLowerCase().includes(keyword))) {
    return { useSlowModel: true, reason: "keywords" };
  }

  try {
    console.log(chalk.blue("[Complexity Check] Starting complexity check"));

    const messagesWithCheck = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messagesWithCheck.splice(
      messagesWithCheck.length - 1,
      0,
      COMPLEXITY_CHECK_PROMPT
    );

    console.log(
      chalk.blue("[Complexity Check] Messages:"),
      JSON.stringify(messagesWithCheck, null, 2)
    );

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messagesWithCheck,
      stream: true,
      max_tokens: 10,
    });

    let foundContent = false;
    for await (const chunk of stream) {
      const contentPiece = chunk.choices?.[0]?.delta?.content;
      if (contentPiece) {
        foundContent = true;
        console.log(
          chalk.blue("[Complexity Check] Found content chunk:"),
          JSON.stringify(contentPiece)
        );
        if (contentPiece.startsWith("==")) {
          console.log(
            chalk.green("[Complexity Check] Detected complex query marker")
          );
          return { useSlowModel: true, reason: "model-detected" };
        }
        break;
      }
    }

    if (!foundContent) {
      console.log(chalk.yellow("[Complexity Check] No content chunks found"));
    }

    return { useSlowModel: false, reason: "model-simple" };
  } catch (error) {
    console.error(chalk.red("[Complexity Check] Error:"), error);
    return { useSlowModel: false, reason: "check-failed" };
  }
}

export function logModelDetermination(
  content: string | ContentPart[],
  useSlowModel: boolean,
  modelConfig: ModelConfig,
  reason: string
) {
  const textContent = extractTextFromContent(content);
  const truncated =
    textContent.length > 50 ? textContent.slice(0, 50) + "..." : textContent;

  console.log(
    chalk.cyan(
      `[Model Selection] ${useSlowModel ? "SLOW" : "FAST"} model selected:\n` +
        `  Content: "${truncated}"\n` +
        `  Model: ${modelConfig.name}\n` +
        `  Length: ${textContent.length}\n` +
        `  Reason: ${reason}`
    )
  );
}
