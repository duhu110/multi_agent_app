from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from multi_agent.core.prompts import ROUTER_SYSTEM_PROMPT
from multi_agent.core.models import get_llm
from multi_agent.core.state import AppState
from multi_agent.shared.json_utils import extract_json_object


ALLOWED = {"rag", "web", "sql", "action"}


def _extract_json(text: str) -> dict:
    return extract_json_object(text)


def _normalize_routes(raw_agents) -> list[str]:
    if isinstance(raw_agents, str):
        raw_agents = [raw_agents]

    selected_agents = []
    if isinstance(raw_agents, list):
        for item in raw_agents:
            if isinstance(item, str) and item in ALLOWED and item not in selected_agents:
                selected_agents.append(item)

    return selected_agents or ["rag"]


def router_node(state: AppState) -> AppState:
    llm = get_llm(temperature=0)

    # user_request = state.get("task_input", "")
    # 优先从 messages 中获取最后一条用户的消息内容
    messages = state.get("messages", [])
    if messages:
        user_request = messages[-1].content
    else:
        user_request = state.get("task_input", "")


    memory = state.get("long_term_memory", [])

    payload = f"""
User memory:
{memory}

Latest user request:
{user_request}
""".strip()

    result = llm.invoke(
        [
            SystemMessage(content=ROUTER_SYSTEM_PROMPT),
            HumanMessage(content=payload),
        ]
    )

    parsed = _extract_json(result.content if isinstance(
        result.content, str) else str(result.content))
    raw_agents = parsed.get("selected_agents", parsed.get("routes", ["rag"]))
    selected_agents = _normalize_routes(raw_agents)

    return {
        "selected_agents": selected_agents,
        "router_reason": parsed.get("reason", "No reason provided."),
    }
