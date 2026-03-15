"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { PriceSnapshotTool } from "@/components/assistant-ui/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockTool } from "@/components/assistant-ui/tools/purchase-stock/PurchaseStockTool";
import { useAssistantBridge } from "@/hooks/test-assistant-ui/use-assistant-runtime";
import {
  appendExecutionEvent,
  createInitialExecutionState,
  resetExecutionState,
} from "@/lib/test-assistant-ui/execution-store";
import { normalizeLangGraphEvent } from "@/lib/test-assistant-ui/langgraph-adapter";
import type {
  AgentRunEvent,
  ChatMessage,
  LangGraphConfig,
} from "@/lib/test-assistant-ui/types";
import { useCallback, useMemo, useRef, useState } from "react";

const parseSseBlock = (
  block: string,
): { event: string; data: unknown } | null => {
  if (!block.trim()) return null;

  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const delimiter = line.indexOf(":");
    const key = (delimiter === -1 ? line : line.slice(0, delimiter)).trim();
    const value = (
      delimiter === -1 ? "" : line.slice(delimiter + 1)
    ).trimStart();

    if (key === "event") event = value;
    if (key === "data") dataLines.push(value);
  }

  const rawData = dataLines.join("\n");
  if (!rawData) return { event, data: null };

  try {
    return { event, data: JSON.parse(rawData) };
  } catch {
    return { event, data: rawData };
  }
};

const unwrapSubgraph = (raw: unknown): unknown => {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0])) {
    return raw[1];
  }
  return raw;
};

const normalizeEventEnvelope = (
  eventName: string,
  data: unknown,
): { eventType: string; payload: unknown } => {
  if (
    eventName === "message" &&
    data &&
    typeof data === "object" &&
    "event" in data &&
    "data" in data
  ) {
    const wrapped = data as { event: string; data: unknown };
    return { eventType: wrapped.event, payload: wrapped.data };
  }

  if (eventName === "messages-tuple") {
    return { eventType: "messages", payload: data };
  }

  return { eventType: eventName, payload: data };
};

const getConfig = (): LangGraphConfig => ({
  apiUrl:
    process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ?? "http://127.0.0.1:2024",
  assistantId: process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID ?? "",
  graphId: process.env.NEXT_PUBLIC_LANGGRAPH_GRAPH_ID ?? "multi_agent",
});

// Simple Mode - assistant-ui stockbroker UI
export default function SimpleAssistantPage() {
  const config = useMemo(() => getConfig(), []);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [execution, setExecution] = useState(createInitialExecutionState);
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef<AbortController | null>(null);

  const applyNormalizedEvents = (
    events: AgentRunEvent[],
    context: { seq: number; raw: unknown; eventType: string },
  ) => {
    for (const event of events) {
      setExecution((prev) => appendExecutionEvent(prev, event, context));
      if (event.type === "message_delta") {
        setMessages((prev) => {
          const last = prev.at(-1);
          if (event.role === "assistant" && last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: `${last.content}${event.delta}` },
            ];
          }
          return [
            ...prev,
            {
              id: `${event.messageId}-${context.seq}`,
              role: event.role,
              content: event.delta,
            },
          ];
        });
      }
    }
  };

  const ensureThreadId = async (): Promise<string> => {
    if (threadId.trim()) return threadId.trim();
    const createdId = crypto.randomUUID();
    const response = await fetch(`${config.apiUrl}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thread_id: createdId, if_exists: "do_nothing" }),
    });

    if (!response.ok) {
      throw new Error(
        `Create thread failed: ${response.status} ${await response.text()}`,
      );
    }

    const json = (await response.json()) as { thread_id?: string };
    const nextThreadId = json.thread_id ?? createdId;
    setThreadId(nextThreadId);
    return nextThreadId;
  };

  const send = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isRunning) return;

      setIsRunning(true);
      const userPrompt = userText.trim();
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: userPrompt },
      ]);

      const controller = new AbortController();
      runRef.current = controller;

      try {
        const currentThreadId = await ensureThreadId();
        setExecution({
          ...resetExecutionState(),
          threadId: currentThreadId,
          status: "running",
        });

        const response = await fetch(
          `${config.apiUrl}/threads/${encodeURIComponent(currentThreadId)}/runs/stream`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              assistant_id: config.assistantId || config.graphId,
              input: {
                thread_id: currentThreadId,
                messages: [{ role: "user", content: userPrompt }],
              },
              config: { configurable: { thread_id: currentThreadId } },
              stream_mode: ["updates", "messages", "debug", "values"],
              stream_subgraphs: true,
            }),
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(
            `Stream failed: ${response.status} ${await response.text()}`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let seq = 0;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");

          while (true) {
            const splitIndex = buffer.indexOf("\n\n");
            if (splitIndex === -1) break;

            const block = buffer.slice(0, splitIndex);
            buffer = buffer.slice(splitIndex + 2);

            const parsed = parseSseBlock(block);
            if (!parsed) continue;

            const { eventType, payload } = normalizeEventEnvelope(
              parsed.event,
              unwrapSubgraph(parsed.data),
            );
            seq += 1;
            const normalized = normalizeLangGraphEvent(eventType, payload);
            applyNormalizedEvents(normalized, {
              seq,
              raw: payload,
              eventType,
            });
          }
        }
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        console.error("[SimpleAssistantPage] stream error:", caught);
      } finally {
        runRef.current = null;
        setIsRunning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRunning, config],
  );

  const stop = useCallback(() => runRef.current?.abort(), []);

  const runtime = useAssistantBridge({
    messages,
    isRunning,
    onSend: send,
    onCancel: stop,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-dvh">
        <div className="flex-grow">
          <Thread />
          <PriceSnapshotTool />
          <PurchaseStockTool />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
