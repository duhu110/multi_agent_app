from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from .prompts import SQL_PLAN_PROMPT, SQL_SUMMARY_PROMPT
from .state import SqlState
from .tools import run_sql_query
from multi_agent.core.models import get_llm


def plan_node(state: SqlState) -> SqlState:
    if "sql" not in state.get("selected_agents", []):
        return {"sql_active": False}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    payload = (
        f"Long-term memory:\n{memory}\n\n"
        f"User request:\n{state.get('task_input', '')}"
    )
    result = llm.invoke(
        [
            SystemMessage(content=SQL_PLAN_PROMPT),
            HumanMessage(content=payload),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {
        "sql_active": True,
        "sql_plan": content.strip(),
    }


def execute_node(state: SqlState) -> SqlState:
    if not state.get("sql_active"):
        return {}

    raw = run_sql_query(state.get("task_input", ""))
    return {
        "sql_result_raw": raw,
        "sql_citations": ["demo_sql_database"],
        "sql_artifacts": raw,
    }


def respond_node(state: SqlState) -> SqlState:
    if not state.get("sql_active"):
        return {}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    raw = state.get("sql_result_raw", {})

    result = llm.invoke(
        [
            SystemMessage(content=SQL_SUMMARY_PROMPT),
            HumanMessage(
                content=(
                    f"Long-term memory: {memory}\n\n"
                    f"User request: {state.get('task_input', '')}\n\n"
                    f"Plan: {state.get('sql_plan', '')}\n\n"
                    f"Executed SQL: {raw.get('sql', '')}\n"
                    f"Rows: {raw.get('rows', [])}\n"
                    f"Summary: {raw.get('summary', '')}"
                )
            ),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {"sql_output": content}
