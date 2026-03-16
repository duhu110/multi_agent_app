"use client";

import {
  AssistantRuntimeProvider,
  useAuiState,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { Client } from "@langchain/langgraph-sdk";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";

const langGraphClient = new Client({
  apiUrl: "http://127.0.0.1:2024",
});

function AssistantUIWorkbench({
  userId,
  assistantId,
}: {
  userId: string;
  assistantId: string;
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

        <aside className="hidden w-80 shrink-0 border-l bg-background/60 xl:flex xl:flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">调试信息</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              当前展示一些线程状态和用户信息。
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="font-medium">基本信息</div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="break-all font-mono text-xs">{userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assistant</span>
                <span className="break-all font-mono text-xs">
                  {assistantId}
                </span>
              </div>
            </section>

            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="font-medium">线程状态</div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">运行状态</span>
                <span>{isRunning ? "running" : "idle"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">消息数</span>
                <span>{messageCount}</span>
              </div>
            </section>

            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="font-medium">更多信息</div>
              <p className="text-xs text-muted-foreground">
                这里后续可以显示 LangGraph updates、自定义事件、工具调用和子 Agent 状态。
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AssistantUIRuntime() {
  const userId = "user_123";
  const assistantId = "multi_agent";

  const runtime = useLangGraphRuntime({
    stream: async (messages, { abortSignal, initialize }) => {
      const { externalId } = await initialize();

      if (!externalId) {
        throw new Error("Thread not found");
      }

      const threadId: string = externalId;

      return langGraphClient.runs.stream(threadId, assistantId, {
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
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantUIWorkbench userId={userId} assistantId={assistantId} />
    </AssistantRuntimeProvider>
  );
}

export default function AssistantUIGPage() {
  return <AssistantUIRuntime />;
}