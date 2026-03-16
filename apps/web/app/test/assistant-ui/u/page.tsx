"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { Client } from "@langchain/langgraph-sdk";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";

const langGraphClient = new Client({
  apiUrl: "http://127.0.0.1:2024",
});

export default function AssistantUIGPage() {
  const userId = "user_123";

  const runtime = useLangGraphRuntime({
    stream: async (messages, { abortSignal, initialize }) => {
      const { externalId } = await initialize();

      if (!externalId) {
        throw new Error("Thread not found");
      }

      return langGraphClient.runs.stream(externalId, "multi_agent", {
        input: { messages },
        streamMode: ["messages", "updates"],
        signal: abortSignal,
        config: {
          configurable: {
            user_id: userId,
          },
        },
      });
    },
    create: async () => {
      const { thread_id } = await langGraphClient.threads.create();
      return { externalId: thread_id };
    },
  });

  return (
    <div className="h-screen overflow-hidden">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}