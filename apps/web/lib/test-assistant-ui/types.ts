export type RunStatus = "idle" | "running" | "completed" | "failed";

export type NodeStatus = "pending" | "running" | "completed" | "failed";

export type ChatRole = "user" | "assistant" | "tool";

export type AgentRunEvent =
  | {
      type: "run_started";
      runId: string;
      threadId?: string;
      ts: string;
    }
  | {
      type: "run_completed";
      runId: string;
      ts: string;
    }
  | {
      type: "run_failed";
      runId: string;
      error: string;
      ts: string;
    }
  | {
      type: "node_started";
      runId?: string;
      nodeId: string;
      label: string;
      ts: string;
    }
  | {
      type: "node_completed";
      runId?: string;
      nodeId: string;
      output?: unknown;
      ts: string;
    }
  | {
      type: "node_failed";
      runId?: string;
      nodeId: string;
      error: string;
      ts: string;
    }
  | {
      type: "message_delta";
      messageId: string;
      role: ChatRole;
      delta: string;
      ts: string;
    }
  | {
      type: "tool_called";
      callId: string;
      toolName: string;
      args?: unknown;
      ts: string;
    }
  | {
      type: "tool_result";
      callId: string;
      toolName?: string;
      result?: unknown;
      isError?: boolean;
      ts: string;
    }
  | {
      type: "unknown";
      raw: unknown;
      ts: string;
    };

export type ExecutionNode = {
  nodeId: string;
  label: string;
  status: NodeStatus;
  startedAt?: string;
  endedAt?: string;
  preview?: string;
  error?: string;
};

export type ToolCallView = {
  callId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  isError?: boolean;
  ts: string;
};

export type RawStreamEvent = {
  seq: number;
  eventType: string;
  raw: unknown;
  ts: string;
};

export type ExecutionState = {
  runId?: string;
  threadId?: string;
  status: RunStatus;
  startedAt?: string;
  endedAt?: string;
  nodes: ExecutionNode[];
  tools: ToolCallView[];
  rawEvents: RawStreamEvent[];
  lastError?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type LangGraphConfig = {
  apiUrl: string;
  assistantId: string;
  graphId: string;
};
