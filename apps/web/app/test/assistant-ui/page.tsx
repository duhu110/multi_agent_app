"use client";

import { ChatShell, type ChatMessage } from "@/components/test-assistant-ui/chat-shell";
import { ExecutionPanel } from "@/components/test-assistant-ui/execution-panel";
import { Button } from "@/components/ui/button";
import { appendExecutionEvent, createInitialExecutionState, resetExecutionState } from "@/lib/test-assistant-ui/execution-store";
import { normalizeLangGraphEvent } from "@/lib/test-assistant-ui/langgraph-adapter";
import type { AgentRunEvent, LangGraphConfig } from "@/lib/test-assistant-ui/types";
import { useMemo, useRef, useState } from "react";

const parseSseBlock = (block: string): { event: string; data: unknown } | null => {
  if (!block.trim()) return null;

  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const delimiter = line.indexOf(":");
    const key = (delimiter === -1 ? line : line.slice(0, delimiter)).trim();
    const value = (delimiter === -1 ? "" : line.slice(delimiter + 1)).trimStart();

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

const normalizeEventEnvelope = (eventName: string, data: unknown): { eventType: string; payload: unknown } => {
  if (eventName === "message" && data && typeof data === "object" && "event" in data && "data" in data) {
    const wrapped = data as { event: string; data: unknown };
    return { eventType: wrapped.event, payload: wrapped.data };
  }

  if (eventName === "messages-tuple") {
    return { eventType: "messages", payload: data };
  }

  return { eventType: eventName, payload: data };
};

const getConfig = (): LangGraphConfig => ({
  apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ?? "http://127.0.0.1:2024",
  assistantId: process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID ?? "",
  graphId: process.env.NEXT_PUBLIC_LANGGRAPH_GRAPH_ID ?? "multi_agent",
});

export default function AssistantUiTestPage() {
  const config = useMemo(() => getConfig(), []);
  const [threadId, setThreadId] = useState("");
  const [prompt, setPrompt] = useState("请概述多智能体系统的关键架构层次。");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [execution, setExecution] = useState(createInitialExecutionState);
  const [error, setError] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef<AbortController | null>(null);

  const applyNormalizedEvents = (events: AgentRunEvent[], context: { seq: number; raw: unknown; eventType: string }) => {
    for (const event of events) {
      setExecution((prev) => appendExecutionEvent(prev, event, context));
      if (event.type === "message_delta") {
        setMessages((prev) => {
          const last = prev.at(-1);
          if (event.role === "assistant" && last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: `${last.content}${event.delta}` }];
          }
          return [...prev, { id: `${event.messageId}-${context.seq}`, role: event.role, content: event.delta }];
        });
      }
      if (event.type === "run_failed") {
        setError(event.error);
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
      throw new Error(`Create thread failed: ${response.status} ${await response.text()}`);
    }

    const json = (await response.json()) as { thread_id?: string };
    const nextThreadId = json.thread_id ?? createdId;
    setThreadId(nextThreadId);
    return nextThreadId;
  };

  const send = async () => {
    if (!prompt.trim() || isRunning) return;

    setError(undefined);
    setIsRunning(true);
    const userPrompt = prompt.trim();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: userPrompt }]);

    const controller = new AbortController();
    runRef.current = controller;

    try {
      const currentThreadId = await ensureThreadId();
      setExecution({ ...resetExecutionState(), threadId: currentThreadId, status: "running" });

      const response = await fetch(`${config.apiUrl}/threads/${encodeURIComponent(currentThreadId)}/runs/stream`, {
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
          stream_mode: ["updates", "events", "messages-tuple", "debug", "metadata"],
          stream_subgraphs: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.status} ${await response.text()}`);
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

          const { eventType, payload } = normalizeEventEnvelope(parsed.event, unwrapSubgraph(parsed.data));
          seq += 1;
          const normalized = normalizeLangGraphEvent(eventType, payload);
          applyNormalizedEvents(normalized, { seq, raw: payload, eventType });
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      applyNormalizedEvents(
        [{ type: "run_failed", runId: execution.runId ?? "unknown-run", error: message, ts: new Date().toISOString() }],
        { seq: Date.now(), raw: { error: message }, eventType: "error" },
      );
    } finally {
      runRef.current = null;
      setIsRunning(false);
    }
  };

  const stop = () => runRef.current?.abort();

  return (
    <main className="grid h-screen min-h-0 grid-cols-[280px_minmax(0,1fr)_360px]">
      <section className="space-y-3 border-r p-3 text-sm">
        <h1 className="font-semibold">LangGraph debug</h1>
        <div className="space-y-1 rounded border p-2 text-xs">
          <p>API: {config.apiUrl || "(empty)"}</p>
          <p>assistant id: {config.assistantId || "(fallback to graph id)"}</p>
          <p>graph id: {config.graphId || "(empty)"}</p>
          <p>thread id: {threadId || "(auto-create on first send)"}</p>
          <p>run status: {execution.status}</p>
        </div>
        <p className="text-muted-foreground text-xs">
          Env: NEXT_PUBLIC_LANGGRAPH_API_URL / NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID / NEXT_PUBLIC_LANGGRAPH_GRAPH_ID
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={stop} disabled={!isRunning}>
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([]);
              setExecution(resetExecutionState());
              setError(undefined);
            }}
          >
            Reset UI
          </Button>
        </div>
      </section>

      <ChatShell input={prompt} setInput={setPrompt} onSend={send} isRunning={isRunning} error={error} messages={messages} />
      <div className="min-h-0 border-l">
        <ExecutionPanel state={execution} />
      </div>
    </main>
  );
}
