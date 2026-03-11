from __future__ import annotations

from multi_agent.services.fake_db import run_demo_query


def run_sql_query(query: str):
    return run_demo_query(query)