from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import execute_node, plan_node, respond_node
from .state import ActionState


def build_graph():
    builder = StateGraph(ActionState)
    builder.add_node("plan", plan_node)
    builder.add_node("execute", execute_node)
    builder.add_node("respond", respond_node)

    builder.add_edge(START, "plan")
    builder.add_edge("plan", "execute")
    builder.add_edge("execute", "respond")
    builder.add_edge("respond", END)

    return builder.compile()


graph = build_graph()