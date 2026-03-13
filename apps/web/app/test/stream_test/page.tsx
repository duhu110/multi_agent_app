"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BotIcon, GripVerticalIcon, MessageSquareTextIcon, Settings2Icon } from "lucide-react";

type Config = {
  baseUrl: string;
  graphId: string;
  assistantId: string;
  threadId: string;
  userId: string;
  streamMode: string;
  prompt: string;
  authToken: string;
};

type StatusKind = "ok" | "warn" | "err" | "idle";
type Role = "user" | "assistant" | "tool" | "system";

type AgentItem =
  | { kind: "message"; id: string; role: Role; text: string; nodeLabel?: string | null; streaming?: boolean }
  | { kind: "step"; id: string; nodeName: string; keys: string }
  | { kind: "status"; id: string; text: string };

type EventItem = {
  id: string;
  seq: number;
  eventType: string;
  typeClass: string;
  nsLabel: string | null;
  parsed: unknown;
  dataRaw: string;
};

type HttpItem = { id: string; text: string; cls: "req" | "resp" | "info" | "err" };

const DEFAULT_CONFIG: Config = {
  baseUrl: "http://127.0.0.1:2024",
  graphId: "multi_agent",
  assistantId: "",
  threadId: "",
  userId: "u1",
  streamMode: "updates,events,messages-tuple",
  prompt: "请结合知识库和SQL说明企业多agent系统的推荐结构.",
  authToken: "",
};

const TYPE_COLORS: Record<string, string> = {
  updates: "bg-sky-600",
  values: "bg-violet-600",
  messages: "bg-cyan-600",
  events: "bg-teal-600",
  metadata: "bg-slate-500",
  debug: "bg-purple-600",
  error: "bg-red-600",
  end: "bg-green-600",
  custom: "bg-orange-600",
};

const ALL_FILTERS = ["all", "updates", "values", "messages", "events", "metadata", "debug", "error", "end", "custom", "other"] as const;

function extractContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") {
          const item = c as { text?: unknown; content?: unknown };
          return String(item.text ?? item.content ?? "");
        }
        return "";
      })
      .join("");
  }
  if (typeof content === "object") {
    const item = content as { text?: unknown; content?: unknown };
    return String(item.text ?? item.content ?? "");
  }
  return "";
}

function parseSseBlock(block: string) {
  if (!block.trim()) return null;
  let event = "message";
  const dataLines: string[] = [];

  for (const raw of block.split(/\r?\n/)) {
    if (!raw || raw.startsWith(":")) continue;
    const colon = raw.indexOf(":");
    const field = (colon === -1 ? raw : raw.slice(0, colon)).trim();
    const value = (colon === -1 ? "" : raw.slice(colon + 1)).trimStart();
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }

  const rawData = dataLines.join("\n");
  let data: unknown = rawData;
  if (rawData && rawData !== "[DONE]") {
    try {
      data = JSON.parse(rawData);
    } catch {
      data = rawData;
    }
  }
  return { event, data, rawData };
}

function unwrapSubgraph(parsed: unknown): { namespace: string[]; data: unknown } {
  if (Array.isArray(parsed) && parsed.length === 2 && Array.isArray(parsed[0]) && parsed[0].every((x) => typeof x === "string")) {
    return { namespace: parsed[0] as string[], data: parsed[1] };
  }
  return { namespace: [], data: parsed };
}

function normalizeEventType(eventType: string, eventData: unknown) {
  if (eventType === "message" && eventData && typeof eventData === "object" && "event" in eventData && "data" in eventData) {
    const wrapped = eventData as { event: string; data: unknown };
    return { type: wrapped.event, data: wrapped.data };
  }
  if (eventType === "messages-tuple") return { type: "messages", data: eventData };
  return { type: eventType, data: eventData };
}

function classifyEvent(type: string) {
  return TYPE_COLORS[type] ? type : "other";
}

function buildSummary(eventType: string, parsed: unknown) {
  try {
    if (eventType === "messages") {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0] as [ { content?: unknown }, unknown ] | { content?: unknown } | undefined;
      if (Array.isArray(first)) {
        const text = extractContent(first[0]?.content);
        return text ? `"${text.slice(0, 80)}"` : JSON.stringify(parsed).slice(0, 100);
      }
      if (first && typeof first === "object") {
        const text = extractContent(first.content);
        return text ? `"${text.slice(0, 80)}"` : JSON.stringify(parsed).slice(0, 100);
      }
      return JSON.stringify(parsed).slice(0, 100);
    }
    if ((eventType === "updates" || eventType === "values") && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed as Record<string, unknown>);
      return `nodes: ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? " ..." : ""}`;
    }
    if (eventType === "events" && parsed && typeof parsed === "object") {
      const item = parsed as { name?: string; event?: string; run_id?: string };
      const name = item.name || item.event || "";
      const run = item.run_id ? ` run=...${item.run_id.slice(-6)}` : "";
      return `${name}${run}`;
    }
    return JSON.stringify(parsed).slice(0, 100);
  } catch {
    return "";
  }
}

export default function StreamTestPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<{ text: string; kind: StatusKind }>({ text: "Idle", kind: "idle" });
  const [leftWidth, setLeftWidth] = useState(420);
  const [eventLogs, setEventLogs] = useState<EventItem[]>([]);
  const [httpLogs, setHttpLogs] = useState<HttpItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(() => new Set(ALL_FILTERS));
  const [agentItems, setAgentItems] = useState<AgentItem[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef(false);
  const idRef = useRef(1);

  const msgCount = useMemo(() => agentItems.filter((x) => x.kind === "message").length, [agentItems]);
  const visibleEvents = useMemo(() => (activeFilters.has("all") ? eventLogs : eventLogs.filter((x) => activeFilters.has(x.typeClass))), [eventLogs, activeFilters]);

  const appendHttp = useCallback((text: string, cls: HttpItem["cls"]) => {
    const id = `http-${idRef.current++}`;
    setHttpLogs((prev) => [...prev, { id, text, cls }]);
  }, []);

  const setStatusText = useCallback((text: string, kind: StatusKind = "idle") => setStatus({ text, kind }), []);
  const baseUrl = useCallback(() => config.baseUrl.trim().replace(/\/+$/, ""), [config.baseUrl]);
  const headers = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const token = config.authToken.trim();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [config.authToken]);
  const getStreamModes = useCallback(() => config.streamMode.split(",").map((s) => s.trim()).filter(Boolean), [config.streamMode]);

  const pushMessage = useCallback((role: Role, text: string, nodeLabel?: string | null) => {
    const id = `agent-${idRef.current++}`;
    setAgentItems((prev) => [...prev, { kind: "message", id, role, text, nodeLabel }]);
  }, []);

  const pushStep = useCallback((nodeName: string, keys: string) => {
    const id = `step-${idRef.current++}`;
    setAgentItems((prev) => [...prev, { kind: "step", id, nodeName, keys }]);
  }, []);

  const pushStatus = useCallback((text: string) => {
    const id = `status-${idRef.current++}`;
    setAgentItems((prev) => [...prev, { kind: "status", id, text }]);
  }, []);

  const flushAi = useCallback(() => {
    setAgentItems((prev) => prev.map((it) => (it.kind === "message" && it.streaming ? { ...it, streaming: false } : it)));
  }, []);

  const appendAiToken = useCallback((text: string, nodeLabel?: string | null) => {
    setAgentItems((prev) => {
      const last = prev.at(-1);
      if (last && last.kind === "message" && last.role === "assistant" && last.streaming) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text}${text}`, nodeLabel: last.nodeLabel ?? nodeLabel ?? "AI" }];
      }
      const id = `agent-${idRef.current++}`;
      return [...prev, { kind: "message", id, role: "assistant", text, nodeLabel: nodeLabel ?? "AI", streaming: true }];
    });
  }, []);

  const handleMsgToken = useCallback((msg: unknown, meta: unknown, nsLabel: string | null) => {
    if (!msg || typeof msg !== "object") return;

    const m = msg as { content?: unknown; text?: unknown; delta?: unknown; type?: string; role?: string; name?: string };
    const content = extractContent(m.content ?? m.text ?? m.delta);
    if (!content) return;

    const type = m.type || m.role || "";
    const isHuman = type === "human" || type === "user";
    const isTool = type === "tool";
    const md = meta as { metadata?: { langgraph_node?: string }; langgraph_node?: string } | undefined;
    const nodeLabel = md?.metadata?.langgraph_node || md?.langgraph_node || m.name || nsLabel || null;

    if (isHuman) {
      flushAi();
      pushMessage("user", content, nodeLabel ?? "User");
      return;
    }
    if (isTool) {
      flushAi();
      pushMessage("tool", content, nodeLabel ?? "Tool");
      return;
    }
    appendAiToken(content, nodeLabel);
  }, [appendAiToken, flushAi, pushMessage]);

  const processAgentEvent = useCallback((eventType: string, parsed: unknown, nsLabel: string | null) => {
    if (!parsed) return;

    if (eventType === "messages") {
      if (Array.isArray(parsed) && parsed.length === 2 && !Array.isArray(parsed[0])) {
        handleMsgToken(parsed[0], parsed[1], nsLabel);
        return;
      }
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        for (const tuple of parsed) {
          if (Array.isArray(tuple)) handleMsgToken(tuple[0], tuple[1], nsLabel);
        }
        return;
      }
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        handleMsgToken(parsed, {}, nsLabel);
      }
      return;
    }

    if (eventType === "updates" && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [node, data] of Object.entries(parsed as Record<string, unknown>)) {
        if (!data || typeof data !== "object") continue;
        const d = data as { messages?: unknown[] } & Record<string, unknown>;

        if (Array.isArray(d.messages) && d.messages.length > 0) {
          for (const x of d.messages) {
            if (!x) continue;
            const obj = Array.isArray(x) ? x[0] : x;
            if (!obj || typeof obj !== "object") continue;
            const mo = obj as { type?: string; content?: unknown };
            const role: Role = mo.type === "human" ? "user" : mo.type === "tool" ? "tool" : "assistant";
            const content = extractContent(mo.content);
            if (content) {
              if (role === "assistant") flushAi();
              pushMessage(role, content, nsLabel || node);
            }
          }
          continue;
        }

        const keys = Object.keys(d).filter((k) => k !== "__root__").join(", ") || "(empty)";
        pushStep(nsLabel ? `${nsLabel} > ${node}` : node, keys);
      }
      return;
    }

    if (eventType === "events" && typeof parsed === "object") {
      const e = parsed as { event?: string; data?: { chunk?: { content?: unknown; text?: unknown; delta?: unknown } }; metadata?: { langgraph_node?: string } };
      if (e.event === "on_chat_model_stream") {
        const chunk = e.data?.chunk;
        const content = extractContent(chunk?.content ?? chunk?.text ?? chunk?.delta);
        if (content) appendAiToken(content, e.metadata?.langgraph_node || nsLabel || "AI");
        return;
      }
      if (e.event === "on_chat_model_end" || e.event === "on_chain_end") flushAi();
      return;
    }

    if (eventType === "end") {
      flushAi();
      pushStatus("✓ Run completed");
      return;
    }

    if (eventType === "error") {
      flushAi();
      if (typeof parsed === "object") {
        const err = parsed as { message?: string; error?: string };
        pushMessage("system", `⚠ Error: ${err.message || err.error || JSON.stringify(parsed)}`, "error");
      } else {
        pushMessage("system", `⚠ Error: ${String(parsed)}`, "error");
      }
    }
  }, [appendAiToken, flushAi, handleMsgToken, pushMessage, pushStatus, pushStep]);

  const appendEvent = useCallback((eventType: string, dataObj: unknown, seq: number) => {
    const dataRaw = typeof dataObj === "string" ? dataObj : JSON.stringify(dataObj);
    let rawParsed = dataObj;
    if (typeof dataObj === "string") {
      try {
        rawParsed = JSON.parse(dataObj);
      } catch {
        rawParsed = null;
      }
    }

    const { namespace, data: parsed } = unwrapSubgraph(rawParsed);
    const nsLabel = namespace.length ? namespace.join(" > ") : null;
    const id = `evt-${idRef.current++}`;
    setEventLogs((prev) => [...prev, { id, seq, eventType, typeClass: classifyEvent(eventType), nsLabel, parsed, dataRaw }]);
    processAgentEvent(eventType, parsed, nsLabel);
  }, [processAgentEvent]);

  const createThreadIfNeeded = useCallback(async (force = false) => {
    if (!force && config.threadId.trim()) return config.threadId.trim();
    const threadId = config.threadId.trim() || (crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}`);
    const body = {
      thread_id: threadId,
      if_exists: "do_nothing",
      metadata: { source: "web-stream-test", graph_id: config.graphId.trim() || "multi_agent" },
    };

    appendHttp("POST /threads", "req");
    appendHttp(JSON.stringify(body), "req");

    const res = await fetch(`${baseUrl()}/threads`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Create thread failed (${res.status}): ${text}`);

    let json: { thread_id?: string } = {};
    try {
      json = JSON.parse(text) as { thread_id?: string };
    } catch {
      // noop
    }

    const actualId = json.thread_id || threadId;
    setConfig((prev) => ({ ...prev, threadId: actualId }));
    appendHttp(`<- ${text.slice(0, 200)}`, "resp");
    setStatusText(`Thread ready: ${actualId}`, "ok");
    return actualId;
  }, [appendHttp, baseUrl, config.graphId, config.threadId, headers, setStatusText]);

  const startRun = useCallback(async () => {
    if (abortRef.current) {
      setStatusText("A run is already in progress", "warn");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setEventLogs([]);
    setHttpLogs([]);
    setAgentItems([]);

    try {
      const threadId = await createThreadIfNeeded(false);
      const assistantId = config.assistantId.trim() || config.graphId.trim() || "multi_agent";
      const streamMode = getStreamModes();

      const body = {
        assistant_id: assistantId,
        input: {
          user_id: config.userId.trim() || "u1",
          thread_id: threadId,
          messages: [{ role: "user", content: config.prompt.trim() }],
        },
        config: { configurable: { thread_id: threadId } },
        metadata: { source: "web-stream-test", graph_id: config.graphId.trim() || "multi_agent" },
        stream_mode: streamMode.length ? streamMode : ["updates", "events"],
        stream_subgraphs: true,
        multitask_strategy: "enqueue",
        on_disconnect: "continue",
      };

      const url = `${baseUrl()}/threads/${encodeURIComponent(threadId)}/runs/stream`;
      appendHttp(`POST ${url.replace(baseUrl(), "")}`, "req");
      appendHttp(JSON.stringify(body, null, 2), "req");
      setStatusText("Run started - streaming...", "ok");

      const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: controller.signal });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Run stream failed (${res.status}): ${text}`);
      }
      if (!res.body) throw new Error("ReadableStream not available.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let seq = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        while (true) {
          const idx = buffer.indexOf("\n\n");
          if (idx === -1) break;
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const evt = parseSseBlock(block);
          if (!evt) continue;

          const normalized = normalizeEventType(evt.event || "message", evt.data);
          seq += 1;
          appendEvent(normalized.type, normalized.data, seq);
        }
      }

      if (buffer.trim()) {
        const evt = parseSseBlock(buffer);
        if (evt) {
          const normalized = normalizeEventType(evt.event || "message", evt.data);
          seq += 1;
          appendEvent(normalized.type, normalized.data, seq);
        }
      }

      flushAi();
      setStatusText(`Stream completed - ${seq} events`, "ok");
    } catch (err) {
      flushAi();
      if (err instanceof Error && err.name === "AbortError") {
        setStatusText("Run aborted by user", "warn");
        appendHttp("[Stream aborted by user]", "info");
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setStatusText(`Run failed: ${message}`, "err");
        appendHttp(`[ERROR] ${message}`, "err");
      }
    } finally {
      abortRef.current = null;
    }
  }, [appendEvent, appendHttp, baseUrl, config.assistantId, config.graphId, config.prompt, config.userId, createThreadIfNeeded, flushAi, getStreamModes, headers, setStatusText]);

  const stopRun = useCallback(() => abortRef.current?.abort(), []);

  const clearAll = useCallback(() => {
    setEventLogs([]);
    setHttpLogs([]);
    setAgentItems([]);
    setStatusText("Cleared", "idle");
  }, [setStatusText]);

  const toggleFilter = useCallback((type: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (type === "all") {
        if (next.has("all")) next.clear();
        else for (const t of ALL_FILTERS) next.add(t);
        return next;
      }

      if (next.has(type)) next.delete(type);
      else next.add(type);

      const nonAll = ALL_FILTERS.filter((x) => x !== "all");
      const allOn = nonAll.every((x) => next.has(x));
      if (allOn) next.add("all");
      else next.delete("all");
      return next;
    });
  }, []);

  const startDragging = useCallback(() => {
    dragRef.current = true;

    const move = (event: MouseEvent) => {
      if (!dragRef.current) return;
      setLeftWidth((prev) => Math.max(320, Math.min(620, prev + event.movementX)));
    };

    const up = () => {
      dragRef.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, []);

  const running = Boolean(abortRef.current);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-muted/30 text-foreground">
      <header className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <h1 className="font-semibold text-sm">LangGraph Stream Test - multi_agent</h1>
        <p className="text-muted-foreground text-xs">
          POST <code>/threads/{"{thread_id}"}/runs/stream</code> with type-aware SSE rendering
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-h-0 flex-col border-r bg-background" style={{ width: leftWidth }}>
          <div className="flex items-center gap-2 border-b px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Settings2Icon className="size-3.5" /> Configuration
          </div>

          <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
            <div><label className="mb-1 block text-muted-foreground text-xs">Base URL</label><Input value={config.baseUrl} onChange={(e) => setConfig((p) => ({ ...p, baseUrl: e.target.value }))} /></div>
            <div><label className="mb-1 block text-muted-foreground text-xs">Graph ID</label><Input value={config.graphId} onChange={(e) => setConfig((p) => ({ ...p, graphId: e.target.value }))} /></div>
            <div><label className="mb-1 block text-muted-foreground text-xs">Assistant UUID (optional)</label><Input value={config.assistantId} placeholder="Leave empty -> graph_id" onChange={(e) => setConfig((p) => ({ ...p, assistantId: e.target.value }))} /></div>
            <div><label className="mb-1 block text-muted-foreground text-xs">Thread ID (auto if empty)</label><Input value={config.threadId} placeholder="e.g. t-dev-001" onChange={(e) => setConfig((p) => ({ ...p, threadId: e.target.value }))} /></div>
            <div><label className="mb-1 block text-muted-foreground text-xs">User ID</label><Input value={config.userId} onChange={(e) => setConfig((p) => ({ ...p, userId: e.target.value }))} /></div>
            <div><label className="mb-1 block text-muted-foreground text-xs">stream_mode (comma sep)</label><Input value={config.streamMode} onChange={(e) => setConfig((p) => ({ ...p, streamMode: e.target.value }))} /></div>
            <div className="col-span-2"><label className="mb-1 block text-muted-foreground text-xs">User Prompt</label><Textarea value={config.prompt} className="min-h-20" onChange={(e) => setConfig((p) => ({ ...p, prompt: e.target.value }))} /></div>
            <div className="col-span-2"><label className="mb-1 block text-muted-foreground text-xs">Bearer Token (optional)</label><Input value={config.authToken} placeholder="Paste token without Bearer" onChange={(e) => setConfig((p) => ({ ...p, authToken: e.target.value }))} /></div>
          </div>

          <div className="flex flex-wrap gap-2 border-t px-3 py-3">
            <Button variant="outline" disabled={running} onClick={() => void createThreadIfNeeded(true)}>Create Thread</Button>
            <Button disabled={running} onClick={() => void startRun()}>Start Run</Button>
            <Button variant="secondary" disabled={!running} onClick={stopRun}>Stop</Button>
            <Button variant="ghost" onClick={clearAll}>Clear All</Button>
          </div>

          <div className="border-t px-3 py-2">
            <Badge variant={status.kind === "ok" ? "secondary" : status.kind === "err" ? "destructive" : "outline"}>{status.text}</Badge>
          </div>

          <Separator />

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide">
              <MessageSquareTextIcon className="size-3.5" /> Agent Output
              <Badge variant="outline" className="ml-auto">{msgCount}</Badge>
            </div>

            <div className="min-h-0 flex-1 border-t">
              <Conversation className="h-full">
                <ConversationContent className="gap-3 p-3">
                  {agentItems.length === 0 ? (
                    <ConversationEmptyState icon={<BotIcon className="size-8" />} title="No output yet" description="Agent output will appear here during stream" />
                  ) : (
                    agentItems.map((item) => {
                      if (item.kind === "step") {
                        return <div key={item.id} className="rounded-md border bg-muted/30 p-2 text-sm"><div className="font-medium text-sky-700 dark:text-sky-300">⬡ {item.nodeName}</div><div className="text-muted-foreground text-xs">{item.keys}</div></div>;
                      }
                      if (item.kind === "status") {
                        return <div key={item.id} className="py-2 text-center text-green-600 text-xs font-medium dark:text-green-400">{item.text}</div>;
                      }
                      return (
                        <Message key={item.id} from={item.role === "assistant" ? "assistant" : item.role}>
                          <MessageContent className={cn(item.role === "tool" && "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/30", item.role === "system" && "rounded-md border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950/30")}>
                            <div className="mb-1 text-muted-foreground text-[11px] uppercase tracking-wide">{item.nodeLabel || item.role}</div>
                            <MessageResponse>{item.streaming ? `${item.text}▋` : item.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    })
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>
          </div>
        </section>

        <div className="group flex w-2 cursor-col-resize items-center justify-center border-r bg-muted/20" onMouseDown={startDragging} role="separator" aria-orientation="vertical" aria-label="Resize panels">
          <GripVerticalIcon className="size-3 text-muted-foreground/60 group-hover:text-muted-foreground" />
        </div>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1 border-b bg-background px-2 py-2">
            <span className="mr-1 text-muted-foreground text-xs uppercase tracking-wide">Filter</span>
            {ALL_FILTERS.map((type) => {
              const active = activeFilters.has(type);
              return <Button key={type} size="xs" variant={active ? "default" : "outline"} className={cn(type !== "all" && active && TYPE_COLORS[type] ? `${TYPE_COLORS[type]} text-white hover:opacity-90` : "")} onClick={() => toggleFilter(type)}>{type}</Button>;
            })}
            <Badge variant="outline" className="ml-auto">{eventLogs.length} events</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {httpLogs.length > 0 && <div className="mb-3 rounded-md border bg-background p-2 font-mono text-[11px]">{httpLogs.map((line) => <div key={line.id} className={cn(line.cls === "req" && "text-slate-500", line.cls === "resp" && "text-sky-700 dark:text-sky-300", line.cls === "err" && "text-red-600 dark:text-red-400", line.cls === "info" && "text-muted-foreground")}>{line.text}</div>)}</div>}

            <Accordion type="multiple" className="w-full rounded-md border bg-background px-2">
              {visibleEvents.map((evt) => (
                <AccordionItem value={evt.id} key={evt.id}>
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex w-full items-center gap-2">
                      <Badge className={cn("text-white", TYPE_COLORS[evt.eventType] || "bg-slate-600")}>{evt.eventType}</Badge>
                      <span className="text-muted-foreground text-xs">#{evt.seq}</span>
                      {evt.nsLabel && <Badge variant="outline" className="max-w-52 truncate text-xs">{evt.nsLabel}</Badge>}
                      <span className="truncate text-muted-foreground text-xs">{buildSummary(evt.eventType, evt.parsed)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="max-h-80 overflow-auto rounded-md border bg-muted/20 p-2 font-mono text-[11px] leading-relaxed">{JSON.stringify(evt.parsed, null, 2) || evt.dataRaw || "(empty)"}</pre>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>
    </div>
  );
}
