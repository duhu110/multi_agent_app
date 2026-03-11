from __future__ import annotations

from multi_agent.services.fake_api import call_demo_api
from multi_agent.utils.state import AppState


def action_node(state: AppState) -> AppState:
    if "action" not in state.get("routes", []):
        return {}

    query = state["messages"][-1].content
    result = call_demo_api(query)
    return {"action_result": result}