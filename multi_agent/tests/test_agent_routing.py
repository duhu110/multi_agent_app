from __future__ import annotations

import multi_agent.agent as agent_module


def test_route_to_selected_agents_dedup_and_filter():
    routes = agent_module.route_to_selected_agents(
        {"selected_agents": ["sql", "rag", "sql", "unknown"]}
    )
    assert routes == ["sql_agent", "rag_agent"]


def test_route_to_selected_agents_fallback():
    assert agent_module.route_to_selected_agents({}) == ["rag_agent"]
    assert agent_module.route_to_selected_agents({"selected_agents": []}) == ["rag_agent"]


def test_build_graph_only_runs_selected_agents(monkeypatch):
    executed: list[str] = []

    def _load_memory_node(_state):
        return {"task_input": "demo", "long_term_memory": ["m1"]}

    def _router_node(_state):
        return {"selected_agents": ["sql", "rag"], "router_reason": "test"}

    def _rag_agent(_state):
        executed.append("rag")
        return {"rag_output": "rag-ok"}

    def _web_agent(_state):
        executed.append("web")
        return {"web_output": "web-ok"}

    def _sql_agent(_state):
        executed.append("sql")
        return {"sql_output": "sql-ok"}

    def _action_agent(_state):
        executed.append("action")
        return {"action_output": "action-ok"}

    def _synthesize_node(state):
        return {"final_answer": f"done:{state.get('rag_output')}|{state.get('sql_output')}"}

    def _persist_memory_node(_state):
        return {}

    monkeypatch.setattr(agent_module, "load_memory_node", _load_memory_node)
    monkeypatch.setattr(agent_module, "router_node", _router_node)
    monkeypatch.setattr(agent_module, "rag_graph", _rag_agent)
    monkeypatch.setattr(agent_module, "web_graph", _web_agent)
    monkeypatch.setattr(agent_module, "sql_graph", _sql_agent)
    monkeypatch.setattr(agent_module, "action_graph", _action_agent)
    monkeypatch.setattr(agent_module, "synthesize_node", _synthesize_node)
    monkeypatch.setattr(agent_module, "persist_memory_node", _persist_memory_node)

    graph = agent_module.build_graph()
    result = graph.invoke({})

    assert set(executed) == {"rag", "sql"}
    assert "web" not in executed
    assert "action" not in executed
    assert result["final_answer"].startswith("done:")
