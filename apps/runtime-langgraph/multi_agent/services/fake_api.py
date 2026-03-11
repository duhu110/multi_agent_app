from __future__ import annotations

from typing import Any, Dict


def call_demo_api(user_query: str) -> Dict[str, Any]:
    return {
        "status": "success",
        "operation": "demo_api_call",
        "message": f"Simulated action completed for: {user_query}",
    }