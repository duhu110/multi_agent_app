import type { AgentRunEvent, ChatRole, ExecutionNode, ExecutionState } from "@/lib/test-assistant-ui/types";

const DEFAULT_RAW_LIMIT = 60;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getText = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(getText).join("");
  const rec = asRecord(value);
  if (!rec) return "";
  return getText(rec.text ?? rec.content ?? rec.delta ?? rec.value);
};

const toRole = (value: unknown): ChatRole => {
  if (value === "user" || value === "human") return "user";
  if (value === "tool") return "tool";
  return "assistant";
};

const extractRunId = (raw: unknown): string | undefined => {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const candidate = rec.run_id ?? rec.runId ?? rec.id;
  return typeof candidate === "string" ? candidate : undefined;
};

const extractNodeId = (raw: unknown, fallback = "unknown-node"): string => {
  const rec = asRecord(raw);
  if (!rec) return fallback;
  const candidate = rec.node_id ?? rec.node ?? rec.name ?? rec.langgraph_node;
  return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
};

const createMessageEvents = (raw: unknown, ts: string): AgentRunEvent[] => {
  if (Array.isArray(raw) && raw.length === 2 && !Array.isArray(raw[0])) {
    return createMessageEvents(raw[0], ts);
  }

  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
    return raw.flatMap((item) => createMessageEvents(item, ts));
  }

  const message = asRecord(raw);
  if (!message) return [];

  const delta = getText(message.content ?? message.text ?? message.delta);
  if (!delta) return [];

  const msgIdCandidate = message.id ?? message.message_id;
  const messageId = typeof msgIdCandidate === "string" ? msgIdCandidate : `${Date.now()}-${Math.random()}`;

  return [
    {
      type: "message_delta",
      messageId,
      role: toRole(message.role ?? message.type),
      delta,
      ts,
    },
  ];
};

const createUpdateEvents = (raw: unknown, ts: string): AgentRunEvent[] => {
  const rec = asRecord(raw);
  if (!rec) return [];

  const events: AgentRunEvent[] = [];
  for (const [node, payload] of Object.entries(rec)) {
    events.push({ type: "node_started", nodeId: node, label: node, ts });

    const payloadRec = asRecord(payload);
    if (payloadRec?.error) {
      events.push(
        {
          type: "node_failed",
          nodeId: node,
          error: String(payloadRec.error),
          ts,
        },
      );
      continue;
    }

    events.push({ type: "node_completed", nodeId: node, output: payload, ts });
  }

  return events;
};

const createTraceEvents = (raw: unknown, ts: string): AgentRunEvent[] => {
  const rec = asRecord(raw);
  if (!rec) return [];

  // Handle debug checkpoint events from stream_mode="debug"
  const type = typeof rec.type === "string" ? rec.type : "";
  if (type === "checkpoint") {
    const payload = asRecord(rec.payload) ?? {};
    const values = asRecord(payload.values) ?? {};
    const next = Array.isArray(payload.next) ? payload.next : [];
    const metadata = asRecord(payload.metadata) ?? {};
    const runId = extractRunId(metadata) ?? extractRunId(payload);

    const events: AgentRunEvent[] = [];

    // Add running nodes from "next"
    for (const nodeId of next) {
      if (typeof nodeId === "string") {
        events.push({ type: "node_started", runId, nodeId, label: nodeId, ts });
      }
    }

    // Add completed nodes from values
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith("__")) continue;
      const nodeId = extractNodeId(value, key);
      events.push({ type: "node_completed", runId, nodeId, output: value, ts });
    }

    return events;
  }

  // Handle task events from stream_mode="debug"
  if (type === "task") {
    const payload = asRecord(rec.payload) ?? {};
    const name = typeof payload.name === "string" ? payload.name : "unknown";
    const result = payload.result;
    const error = payload.error;

    if (error) {
      return [{ type: "node_failed", nodeId: name, error: String(error), ts }];
    }
    if (result !== undefined) {
      return [{ type: "node_completed", nodeId: name, output: result, ts }];
    }
    return [{ type: "node_started", nodeId: name, label: name, ts }];
  }

  // Legacy events format (stream_mode="events")
  const eventName = typeof rec.event === "string" ? rec.event : "";
  const data = asRecord(rec.data) ?? {};
  const metadata = asRecord(rec.metadata) ?? {};
  const runId = extractRunId(rec) ?? extractRunId(data);
  const nodeId = extractNodeId(metadata, extractNodeId(data, "unknown-node"));

  if (["on_chain_start", "on_tool_start", "on_node_start"].includes(eventName)) {
    return [{ type: "node_started", runId, nodeId, label: nodeId, ts }];
  }

  if (["on_chain_end", "on_node_end"].includes(eventName)) {
    return [{ type: "node_completed", runId, nodeId, output: data.output ?? data, ts }];
  }

  if (["on_chain_error", "on_tool_error", "on_node_error"].includes(eventName)) {
    return [
      {
        type: "node_failed",
        runId,
        nodeId,
        error: String(data.error ?? rec.error ?? "Unknown node error"),
        ts,
      },
    ];
  }

  if (eventName === "on_chat_model_stream") {
    const chunk = asRecord(data.chunk) ?? data;
    const delta = getText(chunk);
    if (!delta) return [];
    return [
      {
        type: "message_delta",
        messageId: `${nodeId}-stream`,
        role: "assistant",
        delta,
        ts,
      },
    ];
  }

  if (eventName === "on_tool_start") {
    return [
      {
        type: "tool_called",
        callId: String(data.id ?? `${nodeId}-${ts}`),
        toolName: String(data.name ?? nodeId),
        args: data.input,
        ts,
      },
    ];
  }

  if (eventName === "on_tool_end") {
    return [
      {
        type: "tool_result",
        callId: String(data.id ?? `${nodeId}-${ts}`),
        toolName: typeof data.name === "string" ? data.name : nodeId,
        result: data.output ?? data,
        ts,
      },
    ];
  }

  return [];
};

const createValuesEvents = (raw: unknown, ts: string): AgentRunEvent[] => {
  const rec = asRecord(raw);
  if (!rec) return [];

  const events: AgentRunEvent[] = [];

  // Try to extract node information from the state values
  const checkpoint = asRecord(rec.checkpoint);
  if (checkpoint) {
    const channelValues = asRecord(checkpoint.channel_values);
    if (channelValues) {
      // Look for node execution info in channel values
      for (const [key, value] of Object.entries(channelValues)) {
        if (key.startsWith("__") || value === null || value === undefined) continue;

        // Check if this looks like a node output
        const valRec = asRecord(value);
        if (valRec && (valRec.node || valRec.__pregel_task_path)) {
          const nodeId = extractNodeId(valRec, key);
          events.push({ type: "node_completed", nodeId, output: value, ts });
        }
      }
    }
  }

  // Also try to get node info from the values directly
  const values = asRecord(rec.values);
  if (values) {
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith("__")) continue;
      if (typeof value === "object" && value !== null) {
        const nodeId = extractNodeId(value, key);
        events.push({ type: "node_completed", nodeId, output: value, ts });
      }
    }
  }

  // Handle next/pending nodes
  const next = Array.isArray(rec.next) ? rec.next : [];
  for (const nodeId of next) {
    if (typeof nodeId === "string") {
      events.push({ type: "node_started", nodeId, label: nodeId, ts });
    }
  }

  return events;
};

export function normalizeLangGraphEvent(eventType: string, raw: unknown, ts = new Date().toISOString()): AgentRunEvent[] {
  if (eventType === "messages" || eventType === "messages-tuple") {
    const events = createMessageEvents(raw, ts);
    return events.length ? events : [{ type: "unknown", raw, ts }];
  }

  if (eventType === "updates") {
    const events = createUpdateEvents(raw, ts);
    return events.length ? events : [{ type: "unknown", raw, ts }];
  }

  if (eventType === "values") {
    const events = createValuesEvents(raw, ts);
    return events.length ? events : [{ type: "unknown", raw, ts }];
  }

  if (eventType === "events" || eventType === "debug") {
    const events = createTraceEvents(raw, ts);
    return events.length ? events : [{ type: "unknown", raw, ts }];
  }

  if (eventType === "metadata") {
    const rec = asRecord(raw);
    const runId = rec && typeof rec.run_id === "string" ? rec.run_id : "unknown-run";
    return [{ type: "run_started", runId, threadId: typeof rec?.thread_id === "string" ? rec.thread_id : undefined, ts }];
  }

  if (eventType === "end") {
    return [{ type: "run_completed", runId: extractRunId(raw) ?? "unknown-run", ts }];
  }

  if (eventType === "error") {
    return [
      {
        type: "run_failed",
        runId: extractRunId(raw) ?? "unknown-run",
        error: String((asRecord(raw)?.error as string | undefined) ?? (asRecord(raw)?.message as string | undefined) ?? "Unknown error"),
        ts,
      },
    ];
  }

  return [{ type: "unknown", raw, ts }];
}

const updateNode = (nodes: ExecutionNode[], nodeId: string, patch: Partial<ExecutionNode>): ExecutionNode[] => {
  const index = nodes.findIndex((node) => node.nodeId === nodeId);
  if (index === -1) {
    return [
      ...nodes,
      {
        nodeId,
        label: patch.label ?? nodeId,
        status: patch.status ?? "pending",
        startedAt: patch.startedAt,
        endedAt: patch.endedAt,
        preview: patch.preview,
        error: patch.error,
      },
    ];
  }

  const updated = { ...nodes[index], ...patch };
  return [...nodes.slice(0, index), updated, ...nodes.slice(index + 1)];
};

export function reduceExecutionState(prev: ExecutionState, event: AgentRunEvent): ExecutionState {
  switch (event.type) {
    case "run_started":
      return {
        ...prev,
        runId: event.runId,
        threadId: event.threadId ?? prev.threadId,
        status: "running",
        startedAt: event.ts,
        endedAt: undefined,
        lastError: undefined,
      };
    case "run_completed":
      return {
        ...prev,
        runId: prev.runId ?? event.runId,
        status: "completed",
        endedAt: event.ts,
      };
    case "run_failed":
      return {
        ...prev,
        runId: prev.runId ?? event.runId,
        status: "failed",
        endedAt: event.ts,
        lastError: event.error,
      };
    case "node_started":
      return {
        ...prev,
        nodes: updateNode(prev.nodes, event.nodeId, {
          label: event.label,
          status: "running",
          startedAt: event.ts,
          error: undefined,
        }),
      };
    case "node_completed":
      return {
        ...prev,
        nodes: updateNode(prev.nodes, event.nodeId, {
          status: "completed",
          endedAt: event.ts,
          preview: getText(event.output).slice(0, 180) || JSON.stringify(event.output ?? "").slice(0, 180),
        }),
      };
    case "node_failed":
      return {
        ...prev,
        nodes: updateNode(prev.nodes, event.nodeId, {
          status: "failed",
          endedAt: event.ts,
          error: event.error,
        }),
      };
    case "tool_called":
      return {
        ...prev,
        tools: [
          ...prev.tools,
          {
            callId: event.callId,
            toolName: event.toolName,
            args: event.args,
            ts: event.ts,
          },
        ],
      };
    case "tool_result":
      return {
        ...prev,
        tools: prev.tools.map((tool) =>
          tool.callId === event.callId
            ? { ...tool, result: event.result, isError: event.isError }
            : tool,
        ),
      };
    default:
      return prev;
  }
}

export function appendRawEvent(
  prev: ExecutionState,
  eventType: string,
  raw: unknown,
  seq: number,
  limit = DEFAULT_RAW_LIMIT,
): ExecutionState {
  const nextRaw = [...prev.rawEvents, { seq, eventType, raw, ts: new Date().toISOString() }];
  return {
    ...prev,
    rawEvents: nextRaw.slice(-limit),
  };
}
