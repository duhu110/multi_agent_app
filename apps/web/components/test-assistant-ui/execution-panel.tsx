import { RawEventPanel } from "@/components/test-assistant-ui/raw-event-panel";
import { NodeCard } from "@/components/test-assistant-ui/node-card";
import type { ExecutionState } from "@/lib/test-assistant-ui/types";

export function ExecutionPanel({ state }: { state: ExecutionState }) {
  return (
    <aside className="flex h-full min-h-0 flex-col">
      <header className="border-b px-3 py-3">
        <h2 className="font-semibold">Execution Panel</h2>
        <p className="text-muted-foreground text-xs">Run / node / tool level observability</p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 text-xs">
        <section className="space-y-1 rounded-md border p-2">
          <h3 className="font-medium">Run</h3>
          <p>run id: {state.runId ?? "-"}</p>
          <p>thread id: {state.threadId ?? "-"}</p>
          <p>status: {state.status}</p>
          <p>started: {state.startedAt ?? "-"}</p>
          <p>ended: {state.endedAt ?? "-"}</p>
          {state.lastError ? <p className="text-destructive">error: {state.lastError}</p> : null}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Nodes ({state.nodes.length})</h3>
          {state.nodes.length === 0 ? <p className="text-muted-foreground">No node events yet.</p> : null}
          {state.nodes.map((node) => (
            <NodeCard key={node.nodeId} node={node} />
          ))}
        </section>

        <section className="space-y-2 rounded-md border p-2">
          <h3 className="font-medium">Tool calls ({state.tools.length})</h3>
          {state.tools.length === 0 ? <p className="text-muted-foreground">No tool calls.</p> : null}
          {state.tools.map((tool) => (
            <article key={tool.callId} className="space-y-1 rounded border p-2">
              <p className="font-medium">{tool.toolName}</p>
              <p className="text-muted-foreground break-all">call id: {tool.callId}</p>
              <p>time: {tool.ts}</p>
              {tool.args ? <pre className="bg-muted overflow-auto rounded p-1">args: {JSON.stringify(tool.args, null, 2)}</pre> : null}
              {tool.result ? <pre className="bg-muted overflow-auto rounded p-1">result: {JSON.stringify(tool.result, null, 2)}</pre> : null}
              {tool.isError ? <p className="text-destructive">tool call failed</p> : null}
            </article>
          ))}
        </section>

        <RawEventPanel events={state.rawEvents} />
      </div>
    </aside>
  );
}
