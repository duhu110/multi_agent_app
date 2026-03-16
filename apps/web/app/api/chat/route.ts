import { Client } from "@langchain/langgraph-sdk";
import { createUIMessageStream, createUIMessageStreamResponse, UIMessageStreamWriter } from "ai";
import { WORKFLOW_NODE_CONFIG, AGENT_STEPS, type WorkflowNodeData, type AgentStepInfo } from "@/lib/aisdk.types";

// 初始化 LangGraph Python API 客户端
const langGraphClient = new Client({
  apiUrl: "http://127.0.0.1:2024",
});

// 允许在 Vercel Edge/Serverless 上流式响应，延长超时时间
export const maxDuration = 60;

// Python agent.py 中的 AGENT_NODE_REGISTRY 映射
const AGENT_NODE_REGISTRY: Record<string, string> = {
  rag: "rag_agent",
  web: "web_agent",
  sql: "sql_agent",
  action: "action_agent",
  chat: "chat_agent",
};

// 仅处理顶层图节点的 updates，忽略子图内部节点
const TOP_LEVEL_NODES = new Set(Object.keys(WORKFLOW_NODE_CONFIG));

// 已知的子图内部步骤名称
const SUBGRAPH_STEP_NAMES = new Set(["plan", "execute", "respond", "retrieve", "search"]);

// 仅允许 synthesize 节点的 LLM 文本输出进入打字机流（作为主动流的补充）
const TEXT_STREAM_WHITELIST = new Set(["synthesize"]);

/** 向前端发射一个工作流节点的 data-workflow-node 数据块 */
function emitNode(
  writer: UIMessageStreamWriter,
  nodeName: string,
  status: WorkflowNodeData["status"],
  output?: Record<string, unknown>,
  errorMessage?: string,
  steps?: AgentStepInfo[],
) {
  const config = WORKFLOW_NODE_CONFIG[nodeName];
  if (!config) return;
  writer.write({
    type: "data-workflow-node" as any,
    id: `wf-${nodeName}`,
    data: {
      node: nodeName,
      nodeType: config.nodeType,
      label: config.label,
      status,
      output,
      errorMessage,
      steps,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const rawMessages = body.messages || [];
  const userId = body.userId || "user_123";

  // 数据清洗：确保提取纯文本内容给 Python 后端
  const sanitizedMessages = rawMessages.map((m: any) => {
    let content = m.text || m.content;
    if (content === undefined || content === null) {
      if (m.parts && Array.isArray(m.parts)) {
        content = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
      } else {
        content = "";
      }
    }
    return { role: m.role, content: content };
  });

  // 使用 Vercel AI SDK v6 的 UIMessageStream 响应包装器
  const stream = createUIMessageStream({
    execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
      // 追踪最后一个 running 节点（用于错误处理）
      let lastRunningNode: string | null = null;

      try {
        const thread = await langGraphClient.threads.create();

        const runStream = await langGraphClient.runs.stream(
          thread.thread_id,
          "multi_agent",
          {
            input: { messages: sanitizedMessages },
            streamMode: ["messages", "updates", "events"],
            config: { configurable: { user_id: userId } },
          }
        );

        // 用于管理文本块 id 及已发送的累积内容（messages/partial 每次是全量快照）
        let currentTextId: string | null = null;
        let lastSentContent = "";
        let textFinalized = false;

        // 追踪 router 选中的智能体列表
        let selectedAgents: string[] = [];

        // 追踪 agent 运行状态与子图步骤
        const runningAgents = new Set<string>();
        const completedAgents = new Set<string>();
        const agentStepState: Record<string, AgentStepInfo[]> = {};

        // 流开始时立即显示 load_memory 正在运行
        emitNode(writer, "load_memory", "running");
        lastRunningNode = "load_memory";

        for await (const chunk of runStream) {
          // --- 1. 处理节点完成事件 (updates 流) ---
          if (chunk.event === "updates") {
            const updateData = chunk.data as Record<string, any>;
            for (const [nodeName, nodeOutput] of Object.entries(updateData)) {
              if (!TOP_LEVEL_NODES.has(nodeName)) continue;

              // 标记当前节点完成
              const completedSteps = agentStepState[nodeName];
              emitNode(
                writer,
                nodeName,
                "completed",
                nodeOutput ?? {},
                undefined,
                completedSteps?.map(s => ({ ...s, status: "completed" as const })),
              );

              // 为下一个节点触发 running shimmer
              switch (nodeName) {
                case "load_memory":
                  emitNode(writer, "router", "running");
                  lastRunningNode = "router";
                  break;

                case "router":
                  selectedAgents = nodeOutput?.selected_agents ?? [];
                  for (const agent of selectedAgents) {
                    const agentNode = AGENT_NODE_REGISTRY[agent];
                    if (agentNode) {
                      // 初始化子图步骤状态
                      const stepDefs = AGENT_STEPS[agentNode];
                      if (stepDefs) {
                        agentStepState[agentNode] = stepDefs.map(s => ({
                          ...s,
                          status: "pending" as const,
                        }));
                      }
                      emitNode(writer, agentNode, "running", undefined, undefined, agentStepState[agentNode]);
                      runningAgents.add(agentNode);
                      lastRunningNode = agentNode;
                    }
                  }
                  break;

                case "sql_agent":
                case "rag_agent":
                case "web_agent":
                case "action_agent":
                case "chat_agent": {
                  runningAgents.delete(nodeName);
                  completedAgents.add(nodeName);
                  // 检查所有选定的智能体是否都已完成
                  const allAgentNodes = selectedAgents
                    .map(a => AGENT_NODE_REGISTRY[a])
                    .filter(Boolean);
                  if (allAgentNodes.length > 0 && allAgentNodes.every(n => completedAgents.has(n!))) {
                    emitNode(writer, "collect_results", "running");
                    lastRunningNode = "collect_results";
                  }
                  break;
                }

                case "collect_results":
                  emitNode(writer, "synthesize", "running");
                  lastRunningNode = "synthesize";
                  break;

                case "synthesize": {
                  // 从 updates 输出中提取 final_answer 写入文本流
                  // synthesize_node 使用 llm.invoke() 不产生 messages/partial，需要此回退逻辑
                  const finalAnswer = nodeOutput?.final_answer;
                  if (typeof finalAnswer === "string" && finalAnswer && !textFinalized) {
                    // 如果之前已有流式文本，计算增量；否则写入完整文本
                    if (currentTextId !== null) {
                      const delta = finalAnswer.slice(lastSentContent.length);
                      if (delta) {
                        writer.write({ type: "text-delta", id: currentTextId, delta });
                      }
                      writer.write({ type: "text-end", id: currentTextId });
                    } else {
                      currentTextId = Math.random().toString(36).slice(2);
                      writer.write({ type: "text-start", id: currentTextId });
                      writer.write({ type: "text-delta", id: currentTextId, delta: finalAnswer });
                      writer.write({ type: "text-end", id: currentTextId });
                    }
                    lastSentContent = finalAnswer;
                    textFinalized = true;
                  }
                  emitNode(writer, "persist_memory", "running");
                  lastRunningNode = "persist_memory";
                  break;
                }
              }
            }
          }

          // --- 2. 处理子图内部步骤进度 (events 流) ---
          if (chunk.event === "events") {
            const evt = Array.isArray(chunk.data) ? chunk.data[0] : chunk.data;
            const eventName = evt.event;
            const nodeName = evt.name;
            const checkpointNs: string = evt.metadata?.langgraph_checkpoint_ns || "";

            // 检测子图步骤进度（plan/execute/respond/retrieve/search）
            if (nodeName && SUBGRAPH_STEP_NAMES.has(nodeName)
              && (eventName === "on_chain_start" || eventName === "on_chain_end")) {
              // 通过 checkpoint_ns 确定父级智能体节点
              let parentAgent: string | null = null;
              for (const agent of runningAgents) {
                if (checkpointNs.includes(agent)) {
                  parentAgent = agent;
                  break;
                }
              }

              if (parentAgent && agentStepState[parentAgent]) {
                const steps = agentStepState[parentAgent];
                const step = steps.find(s => s.name === nodeName);
                if (step) {
                  step.status = eventName === "on_chain_start" ? "running" : "completed";
                  // 发送更新后的步骤进度
                  emitNode(writer, parentAgent, "running", undefined, undefined, steps);
                }
              }
            }

            // 保留轨迹数据用于调试
            if (nodeName && !nodeName.startsWith("__") && !nodeName.includes("LangGraph")) {
              if (["on_chain_start", "on_chain_end", "on_tool_start", "on_tool_end", "on_tool_error"].includes(eventName)) {
                const traceData = {
                  id: evt.run_id || Math.random().toString(),
                  event: eventName,
                  name: nodeName,
                  payload: evt.data?.input || evt.data?.output || evt.data?.chunk || null,
                  timestamp: new Date().toISOString(),
                };
                writer.write({ type: "message-metadata", messageMetadata: { trace: traceData } });
              }
            }
          }

          // --- 3. 处理打字机文本流（仅限 synthesize 节点的 LLM 流式输出） ---
          // 当 synthesize_node 改用 llm.stream() 时，此逻辑自动生效
          if (chunk.event === "messages/partial" && !textFinalized) {
            const msgData = (Array.isArray(chunk.data) ? chunk.data[0] : chunk.data) as any;
            const metadata = (Array.isArray(chunk.data) && chunk.data.length > 1 ? chunk.data[1] : {}) as any;
            const streamNodeName = metadata?.langgraph_node;

            // 仅允许白名单节点的 LLM 输出进入打字机流
            if (!TEXT_STREAM_WHITELIST.has(streamNodeName)) {
              continue;
            }

            const msgType = msgData?.type || (msgData && typeof msgData.getType === "function" ? msgData.getType() : null);

            if (msgType === "ai") {
              const fullContent = msgData.content;

              if (typeof fullContent === "string" && fullContent) {
                // messages/partial 每次携带的是累积全量内容，需要计算出本次新增的 delta
                const delta = fullContent.slice(lastSentContent.length);
                if (delta) {
                  if (currentTextId === null) {
                    currentTextId = Math.random().toString(36).slice(2);
                    writer.write({ type: "text-start", id: currentTextId });
                  }
                  writer.write({ type: "text-delta", id: currentTextId, delta });
                  lastSentContent = fullContent;
                }
              }
            }
          }
        }

        // 结束文本块（如果流式文本已通过 messages/partial 开始但未通过 updates 完成）
        if (currentTextId !== null && !textFinalized) {
          writer.write({ type: "text-end", id: currentTextId });
        }
      } catch (error) {
        console.error("LangGraph API Error:", error);
        const errMsg = error instanceof Error ? error.message : "Internal Server Error";
        // 标记最后一个 running 节点为错误状态
        if (lastRunningNode) {
          emitNode(writer, lastRunningNode, "error", undefined, errMsg);
        }
        // 遇到错误时，向流写入错误信息
        writer.write({ type: "error", errorText: errMsg });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
