from __future__ import annotations

from multi_agent.services.fake_web import search_web


def search_public_web(query: str):
    return search_web(query)