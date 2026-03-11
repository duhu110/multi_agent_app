from __future__ import annotations

from typing import Any, Dict, List, Annotated
from typing_extensions import TypedDict


def reduce_task_input(left: str | None, right: str | None) -> str:
    """Keep the existing task_input, ignore new values."""
    if left is not None:
        return left
    return right or ""


def reduce_str(left: str | None, right: str | None) -> str:
    """Append new values with separator."""
    if not left:
        return right or ""
    if not right:
        return left
    return f"{left}\n{right}"


def reduce_dict(left: dict | None, right: dict | None) -> dict:
    """Merge dictionaries."""
    if not left:
        return right or {}
    if not right:
        return left
    return {**left, **right}


def reduce_list(left: list | None, right: list | None) -> list:
    """Concatenate lists."""
    if not left:
        return right or []
    if not right:
        return left
    return left + right


class ActionState(TypedDict, total=False):
    task_input: Annotated[str, reduce_task_input]
    selected_agents: List[str]
    long_term_memory: Annotated[List[str], reduce_list]

    action_active: bool
    action_plan: str
    action_result_raw: Annotated[Dict[str, Any], reduce_dict]

    action_output: Annotated[str, reduce_str]
    action_citations: Annotated[List[str], reduce_list]
    action_artifacts: Annotated[Dict[str, Any], reduce_dict]
