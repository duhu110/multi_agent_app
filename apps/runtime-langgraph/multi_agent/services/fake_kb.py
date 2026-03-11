from __future__ import annotations

from typing import Dict, List


KB_DOCS: List[Dict[str, str]] = [
    {
        "id": "kb-1",
        "title": "LangGraph Application Structure",
        "content": "A LangGraph app usually contains graphs, langgraph.json, dependencies, and optionally an env file.",
    },
    {
        "id": "kb-2",
        "title": "Subgraph-based Multi-Agent Architecture",
        "content": "A stable production pattern is: parent graph for orchestration, child subgraphs for domain agents, shared memory at parent level.",
    },
    {
        "id": "kb-3",
        "title": "Memory Design",
        "content": "Short-term memory belongs to thread-scoped checkpoints. Long-term memory should be stored externally.",
    },
]


def search_kb(query: str) -> List[Dict[str, str]]:
    q = query.lower()
    scored = []

    for doc in KB_DOCS:
        text = f"{doc['title']} {doc['content']}".lower()
        score = sum(1 for token in q.split() if token in text)
        if score > 0:
            scored.append({**doc, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:3] if scored else KB_DOCS[:2]