from __future__ import annotations

import sqlite3
from typing import Any, Dict, List


def run_demo_query(user_query: str) -> Dict[str, Any]:
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()

    cur.execute("create table sales(month text, amount int, region text)")
    cur.executemany(
        "insert into sales values (?, ?, ?)",
        [
            ("2026-01", 100, "north"),
            ("2026-02", 180, "north"),
            ("2026-01", 90, "south"),
            ("2026-02", 210, "south"),
        ],
    )

    sql = "select month, region, amount from sales order by month, region"
    cur.execute(sql)
    rows: List[tuple] = cur.fetchall()
    conn.close()

    return {
        "sql": sql,
        "rows": rows,
        "summary": f"Simulated SQL result for query: {user_query}",
    }