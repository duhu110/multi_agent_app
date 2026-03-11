from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class Settings:
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


def get_settings() -> Settings:
    return Settings()