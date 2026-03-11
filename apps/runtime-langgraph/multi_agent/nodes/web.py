from __future__ import annotations

from multi_agent.services.fake_web import search_web
from multi_agent.utils.state import AppState


def web_node(state: AppState) -> AppState:
    if "web" not in state.get("routes", []):
        return {}

    query = state["messages"][-1].content
    docs = search_web(query)
    return {"web_docs": docs}