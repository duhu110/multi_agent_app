from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from multi_agent.core.models import get_llm
from multi_agent.core.prompts import SYNTHESIZE_SYSTEM_PROMPT
from multi_agent.core.state import AppState


def synthesize_node(state: AppState) -> AppState:
    llm = get_llm(temperature=0)

    # 1. 优先从 messages 中获取用户的原始请求，保持与 router 的逻辑一致
    messages = state.get("messages", [])
    if messages:
        user_request = messages[-1].content
    else:
        user_request = state.get("task_input", "")

    # 2. 在 payload 中增加 Chat output
    payload = f"""
Original request:
{user_request}

Long-term memory:
{state.get("long_term_memory", [])}

Router reason:
{state.get("router_reason", "")}

Chat output:
{state.get("chat_output", "")}

RAG output:
{state.get("rag_output", "")}

Web output:
{state.get("web_output", "")}

SQL output:
{state.get("sql_output", "")}

Action output:
{state.get("action_output", "")}
""".strip()

    result = llm.invoke(
        [
            SystemMessage(content=SYNTHESIZE_SYSTEM_PROMPT),
            HumanMessage(content=payload),
        ]
    )

    content = result.content if isinstance(result.content, str) else str(result.content)
    return {"final_answer": content}