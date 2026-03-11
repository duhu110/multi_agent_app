from __future__ import annotations

from typing import Any


def get_message_content(message: Any) -> str:
    if message is None:
        return ""

    if hasattr(message, "content"):
        content = getattr(message, "content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(item.get("text", ""))
            return "\n".join(parts)
        return str(content)

    if isinstance(message, dict):
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(item.get("text", ""))
            return "\n".join(parts)
        return str(content)

    return str(message)


def get_last_user_input(state: dict) -> str:
    messages = state.get("messages", [])
    if not messages:
        return ""
    return get_message_content(messages[-1])