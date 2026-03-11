from __future__ import annotations

from multi_agent.services.fake_kb import search_kb


def retrieve_internal_docs(query: str):
    return search_kb(query)