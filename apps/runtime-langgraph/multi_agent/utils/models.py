from __future__ import annotations

import os

from langchain_deepseek import ChatDeepSeek


def get_llm(temperature: float = 0.0) -> ChatDeepSeek:
    model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    return ChatDeepSeek(
        model=model_name,
        temperature=temperature,
    )