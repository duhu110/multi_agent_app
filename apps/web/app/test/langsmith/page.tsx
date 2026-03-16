"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { BotIcon, SendIcon, UserIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function LangSmithAdapterTestPage() {
  const [input, setInput] = useState("");

  // AI SDK v5+ 使用 transport 指定 API 端点，不再支持直接传 api 参数
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/langchain-test" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-muted/20">
      <header className="border-b bg-background px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold">Vercel AI SDK x LangChain Adapter</h1>
        <p className="text-xs text-muted-foreground">测试 useChat 结合 LangChainAdapter.toDataStreamResponse</p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <BotIcon className="mb-4 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">发送消息以测试 AI SDK 数据流适配</p>
            </div>
          ) : (
            messages.map((m) => {
              // v5+ 消息内容存储在 parts 数组中，提取文本部分
              const textContent = m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("");
              return (
                <div
                  key={m.id}
                  className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {m.role === "user" ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border shadow-sm"
                    }`}
                  >
                    <span className="whitespace-pre-wrap">{textContent}</span>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Loader2Icon className="size-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t bg-background p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入测试消息 (Enter 发送, Shift+Enter 换行)..."
            className="min-h-[50px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0">
            {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
            <span className="sr-only">发送</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}