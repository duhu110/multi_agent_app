from __future__ import annotations

from typing import Any, Dict, List, Literal, Annotated
from typing_extensions import TypedDict
from operator import add, or_

from langgraph.constants import Send
from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage


AgentName = Literal["rag", "web", "sql", "action"]


def reduce_task_input(left: str | None, right: str | None) -> str:
    """Keep the existing task_input, ignore new values (input shouldn't change)."""
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


class AppState(TypedDict, total=False):
    # identity
    user_id: str
    thread_id: str

    # conversation
    messages: Annotated[List[BaseMessage], add_messages]
    task_input: Annotated[str, reduce_task_input]

    # memory
    long_term_memory: Annotated[List[str], reduce_list]

    # router output
    selected_agents: List[AgentName]
    router_reason: str

    # child graph outputs
    rag_output: Annotated[str, reduce_str]
    rag_citations: Annotated[List[str], reduce_list]
    rag_artifacts: Annotated[Dict[str, Any], reduce_dict]

    web_output: Annotated[str, reduce_str]
    web_citations: Annotated[List[str], reduce_list]
    web_artifacts: Annotated[Dict[str, Any], reduce_dict]

    sql_output: Annotated[str, reduce_str]
    sql_citations: Annotated[List[str], reduce_list]
    sql_artifacts: Annotated[Dict[str, Any], reduce_dict]

    action_output: Annotated[str, reduce_str]
    action_citations: Annotated[List[str], reduce_list]
    action_artifacts: Annotated[Dict[str, Any], reduce_dict]

    # final
    final_answer: str