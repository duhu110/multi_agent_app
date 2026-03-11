from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from multi_agent.core.models import get_llm
from multi_agent.core.prompts import SYNTHESIZE_SYSTEM_PROMPT
from multi_agent.core.state import AppState


def synthesize_node(state: AppState) -> AppState:
    llm = get_llm(temperature=0)

    payload = f"""
Original request:
{state.get("task_input", "")}

Long-term memory:
{state.get("long_term_memory", [])}

Router reason:
{state.get("router_reason", "")}

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