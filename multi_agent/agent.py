from __future__ import annotations

# from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .agents.action.graph import graph as action_graph
from .agents.rag.graph import graph as rag_graph
from .agents.sql.graph import graph as sql_graph
from .agents.web.graph import graph as web_graph
from .core.state import AppState
from .nodes.memory import load_memory_node, persist_memory_node
from .nodes.router import router_node
from .nodes.synthesize import synthesize_node


AGENT_NODE_REGISTRY = {
    "rag": "rag_agent",
    "web": "web_agent",
    "sql": "sql_agent",
    "action": "action_agent",
}


def route_to_selected_agents(state: AppState) -> list[str]:
    selected_agents = state.get("selected_agents", [])
    routes: list[str] = []

    for agent_name in selected_agents:
        node_name = AGENT_NODE_REGISTRY.get(agent_name)
        if node_name and node_name not in routes:
            routes.append(node_name)

    return routes or [AGENT_NODE_REGISTRY["rag"]]


def collect_results_node(state: AppState) -> AppState:
    # Fan-in join point. Keep as an explicit node for future merge/validation logic.
    return {}


def build_graph():
    builder = StateGraph(AppState)

    builder.add_node("load_memory", load_memory_node)
    builder.add_node("router", router_node)

    # 子 AGENT 作为 subgraph 节点接入
    builder.add_node("rag_agent", rag_graph)
    builder.add_node("web_agent", web_graph)
    builder.add_node("sql_agent", sql_graph)
    builder.add_node("action_agent", action_graph)

    builder.add_node("collect_results", collect_results_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_node("persist_memory", persist_memory_node)

    builder.add_edge(START, "load_memory")
    builder.add_edge("load_memory", "router")

    # 根据 router 输出动态分发，仅执行命中的子 AGENT。
    builder.add_conditional_edges(
        "router",
        route_to_selected_agents,
        {
            "rag_agent": "rag_agent",
            "web_agent": "web_agent",
            "sql_agent": "sql_agent",
            "action_agent": "action_agent",
        },
    )

    # 动态 fan-out 后统一 fan-in。
    builder.add_edge("rag_agent", "collect_results")
    builder.add_edge("web_agent", "collect_results")
    builder.add_edge("sql_agent", "collect_results")
    builder.add_edge("action_agent", "collect_results")

    builder.add_edge("collect_results", "synthesize")
    builder.add_edge("synthesize", "persist_memory")
    builder.add_edge("persist_memory", END)

    # checkpointer = InMemorySaver()
    # return builder.compile(checkpointer=checkpointer)
    return builder.compile()

agent = build_graph()
