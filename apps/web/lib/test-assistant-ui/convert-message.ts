import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ChatMessage } from "./types";

/**
 * Convert internal ChatMessage to assistant-ui ThreadMessageLike.
 * ThreadMessageLike only accepts role "user" | "assistant" | "system",
 * so "tool" messages are mapped to "assistant" with a wrench prefix.
 */
export const convertChatMessage = (
  message: ChatMessage,
): ThreadMessageLike => {
  if (message.role === "tool") {
    return {
      role: "assistant" as const,
      content: [{ type: "text" as const, text: `\u{1F6E0}\uFE0F ${message.content}` }],
      id: message.id,
    };
  }
  return {
    role: message.role === "user" ? ("user" as const) : ("assistant" as const),
    content: [{ type: "text" as const, text: message.content }],
    id: message.id,
  };
};
