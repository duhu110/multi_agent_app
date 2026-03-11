from __future__ import annotations

from langchain_deepseek import ChatDeepSeek

from .config import get_settings


def get_llm(temperature: float = 0.0) -> ChatDeepSeek:
    settings = get_settings()
    return ChatDeepSeek(
        model=settings.deepseek_model,
        temperature=temperature,
    )