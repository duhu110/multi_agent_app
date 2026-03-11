from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Annotated
from typing_extensions import TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage


RouteName = Literal["rag", "web", "sql", "action"]


def reduce_list(left: list | None, right: list | None) -> list:
    """Concatenate lists."""
    if not left:
        return right or []
    if not right:
        return left
    return left + right


def reduce_dict(left: dict | None, right: dict | None) -> dict:
    """Merge dictionaries."""
    if not left:
        return right or {}
    if not right:
        return left
    return {**left, **right}


class AppState(TypedDict, total=False):
    # runtime identity
    user_id: str
    thread_id: str

    # conversation
    messages: Annotated[List[BaseMessage], add_messages]

    # memory
    long_term_memory: Annotated[List[str], reduce_list]

    # routing
    routes: List[RouteName]
    router_reason: str

    # artifacts from different agents
    rag_docs: Annotated[List[Dict[str, Any]], reduce_list]
    web_docs: Annotated[List[Dict[str, Any]], reduce_list]
    sql_result: Annotated[Dict[str, Any], reduce_dict]
    action_result: Annotated[Dict[str, Any], reduce_dict]

    # final answer
    answer: str
