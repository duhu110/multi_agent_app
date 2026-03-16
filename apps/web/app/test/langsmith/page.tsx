"use client";

import { useState, useRef, useEffect } from "react";
import { BotIcon, SendIcon, UserIcon, Loader2Icon, ActivityIcon, WrenchIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function LangSmithAdapterTestPage() {
  // 1. 完全抛弃不稳定的 useChat，使用原生 React 状态管理
  const [messages, setMessages] = useState<{id: string, role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]); // 存储右侧轨迹数据
  
  const traceEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data]);

  // 2. 自己接管表单提交和流式解析，彻底告别包版本冲突
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // 立即显示用户的输入
    const userMsg = { id: Date.now().toString(), role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // 发起请求给您的 BFF 层 API
      const res = await fetch("/api/langchain-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, userId: "user_123" })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      
      // 为 AI 预创建一个空的消息气泡
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "" }]);
      let currentAiContent = "";

      // 实时解析底层流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // 提取出完整的行，保留未接收完的碎片

        for (const line of lines) {
          if (!line.trim()) continue;
          
          // 解析 Vercel AI DataStream 协议 
          if (line.startsWith('0:')) {
            try {
              // 处理打字机文本流
              const textChunk = JSON.parse(line.slice(2));
              currentAiContent += textChunk;
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: currentAiContent } : m));
            } catch (err) { console.error("Parse text error", err); }
          } else if (line.startsWith('2:')) {
            try {
              // 处理右侧极客面板的执行轨迹数据
              const dataChunk = JSON.parse(line.slice(2));
              setData(prev => [...prev, ...dataChunk]);
            } catch (err) { console.error("Parse data error", err); }
          } else if (line.startsWith('3:')) {
            console.error("Stream error from server:", line.slice(2));
          }
        }
      }
    } catch (error) {
      console.error("Request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      
      {/* ================= 左侧：聊天主界面 ================= */}
      <div className="flex w-2/3 flex-col border-r shadow-sm bg-background">
        <header className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">多智能体协同终端</h1>
            <p className="text-xs text-muted-foreground">原生 React 解析引擎 · 免除依赖冲突</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <BotIcon className="mb-4 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">发送指令，右侧将实时渲染 LangSmith 级执行轨迹</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {m.role === "user" ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
                  </div>
                  
                  <div className={`flex flex-col gap-2 max-w-[80%]`}>
                    {m.content && (
                      <div className={`rounded-2xl px-5 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30 border shadow-sm"}`}>
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
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

        <footer className="border-t p-4 bg-background">
          <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如: 帮我调用审批系统 API，通过单号为 1001 的报销单..."
              className="min-h-[50px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as any);
                }
              }}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0">
              {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
            </Button>
          </form>
        </footer>
      </div>

      {/* ================= 右侧：LangSmith 风格执行轨迹面板 ================= */}
      <aside className="flex w-1/3 flex-col bg-[#0a0a0a] text-zinc-300">
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-2 bg-[#111]">
          <ActivityIcon className="size-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-zinc-100">执行图谱 (Execution Trace)</h2>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {!data || data.length === 0 ? (
            <div className="text-zinc-600 text-center py-10">等待任务执行...</div>
          ) : (
            data.map((trace, index) => {
              const isTool = trace.event.includes("tool");
              const isEnd = trace.event.includes("end");
              const isStart = trace.event.includes("start");

              return (
                <div key={index} className={`rounded-md border p-3 ${isTool ? 'bg-blue-950/20 border-blue-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold">
                      {isTool ? <WrenchIcon className="size-3 text-blue-400" /> : <ActivityIcon className="size-3 text-purple-400" />}
                      <span className={isTool ? "text-blue-300" : "text-purple-300"}>{trace.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                      {isStart && <Loader2Icon className="size-3 animate-spin" />}
                      {isEnd && <CheckCircle2Icon className="size-3 text-emerald-500" />}
                      <span className="uppercase">{trace.event.replace('on_', '')}</span>
                    </div>
                  </div>
                  
                  {trace.payload && (
                    <div className="mt-2 rounded bg-black/50 p-2 text-[10px] text-zinc-400 break-all max-h-32 overflow-y-auto">
                      {typeof trace.payload === 'object' 
                        ? JSON.stringify(trace.payload, null, 2) 
                        : String(trace.payload)}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={traceEndRef} />
        </div>
      </aside>
    </div>
  );
}