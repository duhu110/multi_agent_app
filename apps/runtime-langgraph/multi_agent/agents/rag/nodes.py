from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from .prompts import RAG_PLAN_PROMPT, RAG_SUMMARY_PROMPT
from .state import RagState
from .tools import retrieve_internal_docs
from multi_agent.core.models import get_llm


def plan_node(state: RagState) -> RagState:
    if "rag" not in state.get("selected_agents", []):
        return {"rag_active": False}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    payload = (
        f"Long-term memory:\n{memory}\n\n"
        f"User request:\n{state.get('task_input', '')}"
    )
    result = llm.invoke(
        [
            SystemMessage(content=RAG_PLAN_PROMPT),
            HumanMessage(content=payload),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {
        "rag_active": True,
        "rag_query": content.strip(),
    }


def retrieve_node(state: RagState) -> RagState:
    if not state.get("rag_active"):
        return {}

    query = state.get("rag_query") or state.get("task_input", "")
    docs = retrieve_internal_docs(query)
    return {
        "rag_docs": docs,
        "rag_citations": [doc["title"] for doc in docs],
        "rag_artifacts": {"docs": docs},
    }


def respond_node(state: RagState) -> RagState:
    if not state.get("rag_active"):
        return {}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])

    docs = state.get("rag_docs", [])
    docs_text = "\n".join([f"- {d['title']}: {d['content']}" for d in docs])

    result = llm.invoke(
        [
            SystemMessage(content=RAG_SUMMARY_PROMPT),
            HumanMessage(
                content=(
                    f"Long-term memory: {memory}\n\n"
                    f"User request: {state.get('task_input', '')}\n\n"
                    f"Retrieved docs:\n{docs_text}"
                )
            ),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {"rag_output": content}
