from __future__ import annotations

import pytest

from multi_agent.agents.action import nodes as action_nodes
from multi_agent.agents.rag import nodes as rag_nodes
from multi_agent.agents.sql import nodes as sql_nodes
from multi_agent.agents.web import nodes as web_nodes


class _DummyResult:
    content = "planned-query"


class _DummyLLM:
    def __init__(self):
        self.messages = None

    def invoke(self, messages):
        self.messages = messages
        return _DummyResult()


@pytest.mark.parametrize(
    ("module", "plan_func", "selected_agent", "active_flag", "plan_field"),
    [
        (rag_nodes, rag_nodes.plan_node, "rag", "rag_active", "rag_query"),
        (web_nodes, web_nodes.plan_node, "web", "web_active", "web_query"),
        (sql_nodes, sql_nodes.plan_node, "sql", "sql_active", "sql_plan"),
        (action_nodes, action_nodes.plan_node, "action", "action_active", "action_plan"),
    ],
)
def test_plan_nodes_consume_parent_memory(
    monkeypatch, module, plan_func, selected_agent, active_flag, plan_field
):
    llm = _DummyLLM()
    monkeypatch.setattr(module, "get_llm", lambda temperature=0: llm)

    state = {
        "selected_agents": [selected_agent],
        "task_input": "create a summary",
        "long_term_memory": ["prefer concise answer", "enterprise context"],
    }

    result = plan_func(state)

    assert result[active_flag] is True
    assert result[plan_field] == "planned-query"
    assert llm.messages is not None
    assert "Long-term memory" in llm.messages[1].content
    assert "prefer concise answer" in llm.messages[1].content
