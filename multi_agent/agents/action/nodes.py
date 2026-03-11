from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from .prompts import ACTION_PLAN_PROMPT, ACTION_SUMMARY_PROMPT
from .state import ActionState
from .tools import call_business_api
from multi_agent.core.models import get_llm


def plan_node(state: ActionState) -> ActionState:
    if "action" not in state.get("selected_agents", []):
        return {"action_active": False}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    payload = (
        f"Long-term memory:\n{memory}\n\n"
        f"User request:\n{state.get('task_input', '')}"
    )
    result = llm.invoke(
        [
            SystemMessage(content=ACTION_PLAN_PROMPT),
            HumanMessage(content=payload),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {
        "action_active": True,
        "action_plan": content.strip(),
    }


def execute_node(state: ActionState) -> ActionState:
    if not state.get("action_active"):
        return {}

    raw = call_business_api(state.get("task_input", ""))
    return {
        "action_result_raw": raw,
        "action_citations": ["demo_business_api"],
        "action_artifacts": raw,
    }


def respond_node(state: ActionState) -> ActionState:
    if not state.get("action_active"):
        return {}

    llm = get_llm(temperature=0)
    memory = state.get("long_term_memory", [])
    raw = state.get("action_result_raw", {})

    result = llm.invoke(
        [
            SystemMessage(content=ACTION_SUMMARY_PROMPT),
            HumanMessage(
                content=(
                    f"Long-term memory: {memory}\n\n"
                    f"User request: {state.get('task_input', '')}\n\n"
                    f"Plan: {state.get('action_plan', '')}\n\n"
                    f"Execution result: {raw}"
                )
            ),
        ]
    )
    content = result.content if isinstance(result.content, str) else str(result.content)
    return {"action_output": content}
