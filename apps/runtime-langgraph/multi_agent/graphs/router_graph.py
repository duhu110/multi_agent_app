from langgraph.graph import StateGraph, START, END
from app.utils.state import AppState
from app.nodes.router import router_node

builder = StateGraph(AppState)
builder.add_node("router", router_node)
builder.add_edge(START, "router")
builder.add_edge("router", END)

graph = builder.compile()