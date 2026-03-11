from __future__ import annotations

from multi_agent.core.memory import FAKE_LONG_TERM_MEMORY
from multi_agent.core.state import AppState
from multi_agent.shared.message_utils import get_last_user_input


def load_memory_node(state: AppState) -> AppState:
    user_id = state.get("user_id", "u1")
    return {
        "long_term_memory": FAKE_LONG_TERM_MEMORY.get(user_id, []),
        "task_input": get_last_user_input(state),
    }


def persist_memory_node(state: AppState) -> AppState:
    # DEMO 不真正写回数据库
    return {}