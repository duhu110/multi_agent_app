import type { ExecutionNode } from "@/lib/test-assistant-ui/types";
import { cn } from "@/lib/utils";

const statusClass: Record<ExecutionNode["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/20 text-destructive",
};

export function NodeCard({ node }: { node: ExecutionNode }) {
  return (
    <article className="space-y-1 rounded-md border p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{node.label}</p>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase", statusClass[node.status])}>{node.status}</span>
      </div>
      <p className="text-muted-foreground break-all">id: {node.nodeId}</p>
      {node.startedAt ? <p>start: {node.startedAt}</p> : null}
      {node.endedAt ? <p>end: {node.endedAt}</p> : null}
      {node.preview ? <p className="text-muted-foreground line-clamp-3">preview: {node.preview}</p> : null}
      {node.error ? <p className="text-destructive">error: {node.error}</p> : null}
    </article>
  );
}
