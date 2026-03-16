import { Client } from "@langchain/langgraph-sdk";

const langGraphClient = new Client({
    apiUrl: "http://127.0.0.1:2024",
});

export const maxDuration = 60;

export async function POST(req: Request) {
    const body = await req.json();
    const rawMessages = body.messages || [];
    const userId = body.userId || "user_123";

    // 数据清洗
    const sanitizedMessages = rawMessages.map((m: any) => {
        let content = m.content;
        if (content === undefined || content === null) {
            if (m.parts && Array.isArray(m.parts)) {
                content = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
            } else {
                content = "";
            }
        }
        return { role: m.role, content: content };
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
        async start(controller) {
            try {
                const thread = await langGraphClient.threads.create();

                const runStream = await langGraphClient.runs.stream(
                    thread.thread_id,
                    "multi_agent",
                    {
                        input: { messages: sanitizedMessages },
                        streamMode: ["messages", "events"],
                        config: { configurable: { user_id: userId } },
                    }
                );

                for await (const chunk of runStream) {

                    // --- 1. 处理底层执行轨迹 (LangSmith 面板) ---
                    if (chunk.event === "events") {
                        const evt = Array.isArray(chunk.data) ? chunk.data[0] : chunk.data;
                        const eventName = evt.event;
                        const nodeName = evt.name;

                        if (nodeName && !nodeName.startsWith("__") && !nodeName.includes("LangGraph")) {
                            if (["on_chain_start", "on_chain_end", "on_tool_start", "on_tool_end", "on_tool_error"].includes(eventName)) {
                                const traceData = {
                                    id: evt.run_id || Math.random().toString(),
                                    event: eventName,
                                    name: nodeName,
                                    payload: evt.data?.input || evt.data?.output || evt.data?.chunk || null,
                                    timestamp: new Date().toISOString()
                                };
                                controller.enqueue(encoder.encode(`2:[${JSON.stringify(traceData)}]\n`));
                            }
                        }
                    }

                    // --- 2. 处理打字机文本流 (主聊天界面) ---
                    // --- 2. 处理打字机文本流 (主聊天界面) ---
                    if (chunk.event === "messages/partial") {
                        // 【修复 2】：使用 as any 彻底打断 TS 的 never 推断
                        const msgData = (Array.isArray(chunk.data) ? chunk.data[0] : chunk.data) as any;

                        // 【修复 1】：给 {} 也加上 as any，防止 TS 报错找不到属性
                        const metadata = (Array.isArray(chunk.data) && chunk.data.length > 1 ? chunk.data[1] : {}) as any;
                        const nodeName = metadata?.langgraph_node;

                        // 只要是 router 节点的输出，格杀勿论，绝对不准推给前端
                        if (nodeName === "router") {
                            continue;
                        }

                        // 因为上面加了 as any，这里的链式调用现在绝对安全了
                        const msgType = msgData?.type || (msgData && typeof msgData.getType === 'function' ? msgData.getType() : null);

                        if (msgType === "ai") {
                            const content = msgData.content;

                            if (typeof content === "string" && content) {
                                // 正常的文本增量流 (比如 synthesize 最终合成节点)
                                controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("LangGraph API Error:", error);
                const errMsg = error instanceof Error ? error.message : "Internal Server Error";
                controller.enqueue(encoder.encode(`3:${JSON.stringify(errMsg)}\n`));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(customStream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "x-vercel-ai-data-stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}