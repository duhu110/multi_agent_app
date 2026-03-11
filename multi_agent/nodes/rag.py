from __future__ import annotations

from multi_agent.services.fake_kb import search_kb
from multi_agent.utils.state import AppState


def rag_node(state: AppState) -> AppState:
    if "rag" not in state.get("routes", []):
        return {}

    query = state["messages"][-1].content
    docs = search_kb(query)
    return {"rag_docs": docs}