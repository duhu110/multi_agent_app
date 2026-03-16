import { Client } from "@langchain/langgraph-sdk";

const langGraphClient = new Client({
  apiUrl: "http://127.0.0.1:2024",
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const rawMessages = body.messages || [];
  const userId = body.userId || "user_123";

  // 【核心修复】数据清洗：将 AI SDK v3 的 parts 结构展平为 LangChain Python 认识的 content 结构
  const sanitizedMessages = rawMessages.map((m: any) => {
    let content = m.content;

    // 如果没有 content 但存在 parts，则从 parts 中提取文本
    if (content === undefined || content === null) {
      if (m.parts && Array.isArray(m.parts)) {
        content = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n');
      } else {
        content = ""; // 兜底空字符串
      }
    }

    return {
      role: m.role,
      content: content,
      // 如果您的后端后续还需要支持前端传回 tool_calls 结果，可以在这里继续映射格式
    };
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
            // 这里传入清洗后的 messages
            input: { messages: sanitizedMessages }, 
            streamMode: "messages",
            config: {
              configurable: {
                user_id: userId,
              },
            },
          }
        );

        for await (const chunk of runStream) {
          if (chunk.event === "messages/partial") {
            const dataArr = Array.isArray(chunk.data) ? chunk.data : [chunk.data];
            const msgData = dataArr[0] as any;

            const nodeName = msgData.response_metadata?.langgraph_node || msgData.additional_kwargs?.langgraph_node;

            if (nodeName === "router") {
              continue;
            }

            const msgType = msgData.type || (typeof msgData.getType === 'function' ? msgData.getType() : null);
            
            if (msgType === "ai") {
              const content = msgData.content;
              
              if (typeof content === "string" && content) {
                const encodedChunk = `0:${JSON.stringify(content)}\n`;
                controller.enqueue(encoder.encode(encodedChunk));
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
      "Content-Type": "text/x-unknown",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}