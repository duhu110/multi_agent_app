from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import plan_node, respond_node, retrieve_node
from .state import RagState


def build_graph():
    builder = StateGraph(RagState)
    builder.add_node("plan", plan_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("respond", respond_node)

    builder.add_edge(START, "plan")
    builder.add_edge("plan", "retrieve")
    builder.add_edge("retrieve", "respond")
    builder.add_edge("respond", END)

    return builder.compile()


graph = build_graph()