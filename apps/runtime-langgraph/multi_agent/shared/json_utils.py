from __future__ import annotations

import json
import re
from typing import Any, Dict


def extract_json_object(text: str) -> Dict[str, Any]:
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except Exception:
            pass

    obj = re.search(r"(\{.*\})", text, re.DOTALL)
    if obj:
        try:
            return json.loads(obj.group(1))
        except Exception:
            pass

    return {}