from multi_agent.nodes.router import _normalize_routes, _extract_json


def test_normalize_routes():
    assert _normalize_routes(["rag", "sql", "rag", "unknown"]) == ["rag", "sql"]
    assert _normalize_routes("rag") == ["rag"]


def test_extract_json():
    payload = '{"routes":["web","sql"],"reason":"Need latest info and data lookup."}'
    parsed = _extract_json(payload)
    assert parsed["routes"] == ["web", "sql"]