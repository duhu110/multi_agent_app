from __future__ import annotations

from typing import Dict, List


def search_web(query: str) -> List[Dict[str, str]]:
    return [
        {
            "title": f"Official public result for: {query}",
            "content": f"Simulated latest public documentation related to: {query}",
            "url": "https://example.com/official",
        },
        {
            "title": "Vendor update notes",
            "content": "Simulated public release/update notes.",
            "url": "https://example.com/releases",
        },
    ]