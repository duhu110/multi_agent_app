from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import plan_node, respond_node, search_node
from .state import WebState


def build_graph():
    builder = StateGraph(WebState)
    builder.add_node("plan", plan_node)
    builder.add_node("search", search_node)
    builder.add_node("respond", respond_node)

    builder.add_edge(START, "plan")
    builder.add_edge("plan", "search")
    builder.add_edge("search", "respond")
    builder.add_edge("respond", END)

    return builder.compile()


graph = build_graph()