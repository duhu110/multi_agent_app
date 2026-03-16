"use client";

import { useState } from "react";
import {
  AssistantRuntimeProvider,
  useAuiState,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { Client } from "@langchain/langgraph-sdk";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";

// 引入您已经写好的 adapter 和类型
import { normalizeLangGraphEvent, reduceExecutionState } from "@/lib/test-assistant-ui/langgraph-adapter";
import type { ExecutionState } from "@/lib/test-assistant-ui/types";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

const langGraphClient = new Client({
  apiUrl: "http://127.0.0.1:2024",
});

function AssistantUIWorkbench({
  userId,
  assistantId,
  executionState,
}: {
  userId: string;
  assistantId: string;
  executionState: ExecutionState;
}) {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const messageCount = useAuiState((s) => s.thread.messages.length);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Assistant UI 工作台</div>
          <div className="truncate text-xs text-muted-foreground">
            {assistantId} · user: {userId}
          </div>
        </div>

        <span
          className={
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
            (isRunning
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
          }
        >
          {isRunning ? "运行中" : "空闲"} · {messageCount}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-h-0 flex-1">
          <Thread />
        </main>

        <aside className="hidden w-96 shrink-0 border-l bg-muted/30 xl:flex xl:flex-col">
          <div className="border-b bg-background px-4 py-3">
            <h2 className="text-sm font-semibold">执行图谱 (Execution Trace)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              实时展示 Agent 路由、节点流转与工具调用状态。
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {executionState.nodes.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-8">
                暂无执行记录。发送消息开始追踪。
              </div>
            ) : (
              <div className="space-y-3">
                {executionState.nodes.map((node) => (
                  <div key={node.nodeId} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        {node.status === "running" && <Loader2Icon className="size-4 animate-spin text-blue-500" />}
                        {node.status === "completed" && <CheckCircle2Icon className="size-4 text-emerald-500" />}
                        {node.status === "failed" && <XCircleIcon className="size-4 text-red-500" />}
                        <span>{node.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase">{node.status}</span>
                    </div>
                    
                    {/* 预览节点输出内容 */}
                    {node.preview && (
                      <div className="rounded-md bg-muted/50 p-2 font-mono text-xs text-muted-foreground line-clamp-3 break-all">
                        {node.preview}
                      </div>
                    )}
                    
                    {/* 错误展示 */}
                    {node.error && (
                      <div className="rounded-md bg-red-500/10 p-2 text-xs text-red-600 line-clamp-2">
                        {node.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* 可以增加工具调用的展示模块 */}
            {executionState.tools.length > 0 && (
               <section className="mt-6 space-y-2">
                 <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">工具调用 (Tools)</div>
                 {executionState.tools.map((tool) => (
                    <div key={tool.callId} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                      <div className="font-mono text-xs font-semibold text-blue-600">🛠 {tool.toolName}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{JSON.stringify(tool.args)}</div>
                    </div>
                 ))}
               </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AssistantUIRuntime() {
  const userId = "user_123";
  const assistantId = "multi_agent";

  // 在外层维护执行状态，用于驱动右侧的追踪面板
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: "idle",
    nodes: [],
    tools: [],
    rawEvents: [],
  });

  const runtime = useLangGraphRuntime({
    stream: async (messages, { abortSignal, initialize }) => {
      const { externalId } = await initialize();

      if (!externalId) {
        throw new Error("Thread not found");
      }

      const threadId: string = externalId;
      
      // 每次开始新请求时，重置本地状态（或者保留追加，根据您的需求）
      setExecutionState(prev => ({ ...prev, status: "running", nodes: [], tools: [] }));

      // 获取原始流，注意这里增加了 "debug" 模式，它会暴露出节点跳转的详细信息！
      const rawStream = await langGraphClient.runs.stream(threadId, assistantId, {
        input: { messages },
        streamMode: ["messages", "updates", "debug"], // <-- 必须加上 debug 或 events
        signal: abortSignal,
        config: {
          configurable: {
            user_id: userId,
          },
        },
      });

      // 构建一个异步生成器，拦截流并分发数据
      return (async function* () {
        for await (const chunk of rawStream) {
          
          // 1. 将事件喂给您的 Adapter，更新右侧的侧边栏状态
          const parsedEvents = normalizeLangGraphEvent(chunk.event, chunk.data);
          setExecutionState(prev => {
            let next = prev;
            for (const e of parsedEvents) {
              next = reduceExecutionState(next, e);
            }
            return next;
          });

          // 2. 拦截并过滤消息：防止 Router 内部思考(JSON)泄露到主屏幕
          if (chunk.event === "messages/partial" || chunk.event === "messages/complete") {
            const dataArr = Array.isArray(chunk.data) ? chunk.data : [chunk.data];
            const msgData = dataArr[0];
            
            // 如果这个消息是由 router 节点生成的，我们直接跳过，不要 yield 给 UI！
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((msgData as any)?.metadata?.langgraph_node === "router") {
              continue; 
            }
          }

          // 3. 将经过过滤的块交给 assistant-ui 渲染主聊天
          yield chunk;
        }
      })();
    },
    create: async () => {
      const { thread_id } = await langGraphClient.threads.create();
      return { externalId: thread_id };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantUIWorkbench 
        userId={userId} 
        assistantId={assistantId} 
        executionState={executionState} 
      />
    </AssistantRuntimeProvider>
  );
}

export default function AssistantUIGPage() {
  return <AssistantUIRuntime />;
}