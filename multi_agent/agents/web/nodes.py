from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from .prompts import WEB_PLAN_PROMPT, WEB_SUMMARY_PROMPT
from .state import WebState
from .tools import search_public_web
from multi_agent.core.models import get_llm


def plan_node(state: WebState) -> WebState:
    if "web" not in state.get("selected_agents", []):
        return {"web_active": False}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    payload = (
        f"Long-term memory:\n{memory}\n\n"
        f"User request:\n{state.get('task_input', '')}"
    )
    result = llm.invoke(
        [
            SystemMessage(content=WEB_PLAN_PROMPT),
            HumanMessage(content=payload),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {
        "web_active": True,
        "web_query": content.strip(),
    }


def search_node(state: WebState) -> WebState:
    if not state.get("web_active"):
        return {}

    query = state.get("web_query") or state.get("task_input", "")
    docs = search_public_web(query)
    return {
        "web_docs": docs,
        "web_citations": [doc["title"] for doc in docs],
        "web_artifacts": {"docs": docs},
    }


def respond_node(state: WebState) -> WebState:
    if not state.get("web_active"):
        return {}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    docs = state.get("web_docs", [])
    docs_text = "\n".join([f"- {d['title']}: {d['content']}" for d in docs])

    result = llm.invoke(
        [
            SystemMessage(content=WEB_SUMMARY_PROMPT),
            HumanMessage(
                content=(
                    f"Long-term memory: {memory}\n\n"
                    f"User request: {state.get('task_input', '')}\n\n"
                    f"Public results:\n{docs_text}"
                )
            ),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {"web_output": content}
