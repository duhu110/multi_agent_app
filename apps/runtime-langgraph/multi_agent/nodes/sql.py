from __future__ import annotations

from multi_agent.services.fake_db import run_demo_query
from multi_agent.utils.state import AppState


def sql_node(state: AppState) -> AppState:
    if "sql" not in state.get("routes", []):
        return {}

    query = state["messages"][-1].content
    result = run_demo_query(query)
    return {"sql_result": result}