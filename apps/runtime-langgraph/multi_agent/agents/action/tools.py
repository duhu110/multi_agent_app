from __future__ import annotations

from multi_agent.services.fake_api import call_demo_api


def call_business_api(query: str):
    return call_demo_api(query)