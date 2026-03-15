"use client";

import { useExternalStoreRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { convertChatMessage } from "@/lib/test-assistant-ui/convert-message";
import type { ChatMessage } from "@/lib/test-assistant-ui/types";

type UseAssistantBridgeOptions = {
  messages: ChatMessage[];
  isRunning: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
};

export function useAssistantBridge({
  messages,
  isRunning,
  onSend,
  onCancel,
}: UseAssistantBridgeOptions) {
  const handleNew = useCallback(
    async (appendMessage: { content: readonly { type: string; text?: string }[] }) => {
      const textPart = appendMessage.content.find(
        (p): p is { type: "text"; text: string } => p.type === "text",
      );
      const text = textPart?.text ?? "";
      if (text.trim()) onSend(text);
    },
    [onSend],
  );

  const handleCancel = useCallback(async () => onCancel(), [onCancel]);

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: convertChatMessage,
    onNew: handleNew,
    onCancel: handleCancel,
  });

  return runtime;
}
