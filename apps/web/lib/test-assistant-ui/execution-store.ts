import { appendRawEvent, reduceExecutionState } from "@/lib/test-assistant-ui/langgraph-adapter";
import type { AgentRunEvent, ExecutionState } from "@/lib/test-assistant-ui/types";

export const createInitialExecutionState = (): ExecutionState => ({
  status: "idle",
  nodes: [],
  tools: [],
  rawEvents: [],
});

export const resetExecutionState = (): ExecutionState => createInitialExecutionState();

export function appendExecutionEvent(
  prev: ExecutionState,
  event: AgentRunEvent,
  context?: { eventType?: string; raw?: unknown; seq?: number },
): ExecutionState {
  let next = reduceExecutionState(prev, event);
  if (context?.eventType && context.seq !== undefined) {
    next = appendRawEvent(next, context.eventType, context.raw, context.seq);
  }
  return next;
}
