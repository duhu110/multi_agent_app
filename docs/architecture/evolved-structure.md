# 演进后目录结构（2026-03-11）

## 目标

- 保留当前可运行的 LangGraph 多智能体项目
- 预留未来 FastAPI 网关与 Web UI 的目录骨架
- `infra` 只保留本地数据库与向量化相关目录
- 暂不引入 `packages` 与 CI/CD 目录

## 目录树

```text
multi_agent_app/
├─ apps/
│  ├─ runtime-langgraph/
│  │  ├─ langgraph.json
│  │  ├─ main.py
│  │  ├─ pyproject.toml
│  │  ├─ uv.lock
│  │  ├─ multi_agent/
│  │  ├─ scripts/
│  │  └─ tests/
│  ├─ gateway-api/
│  │  ├─ app/
│  │  │  ├─ routers/
│  │  │  ├─ services/
│  │  │  ├─ clients/
│  │  │  ├─ repositories/
│  │  │  ├─ models/
│  │  │  ├─ schemas/
│  │  │  ├─ middleware/
│  │  │  └─ sse/
│  │  ├─ migrations/
│  │  └─ tests/
│  └─ web/
│     ├─ app/
│     ├─ components/
│     │  ├─ chat/
│     │  ├─ timeline/
│     │  ├─ run-tree/
│     │  └─ thread-list/
│     ├─ features/
│     │  ├─ streaming/
│     │  ├─ threads/
│     │  └─ observability/
│     ├─ lib/
│     ├─ public/dev/
│     └─ tests/
├─ docs/
│  ├─ architecture/evolved-structure.md
│  ├─ README.md
│  ├─ deep-research-report.md
│  └─ conversation-summary-2026-03-11.md
└─ infra/
   └─ docker/
      ├─ db/
      │  ├─ init/
      │  └─ data/
      └─ vector/
         ├─ data/
         └─ index/
```

## 迁移说明

本次已从仓库根目录迁移到 `apps/runtime-langgraph` 的内容：

- `langgraph.json`
- `main.py`
- `pyproject.toml`
- `uv.lock`
- `.env`
- `multi_agent/`
- `scripts/`
- `tests/`

## 运行路径变化

迁移前（旧）：

- `uv run python main.py serve`
- `http://127.0.0.1:8080/tests/stream_test.html`

迁移后（新）：

- `cd apps/runtime-langgraph && uv run python main.py serve --no-reload`
- `http://127.0.0.1:8080/apps/runtime-langgraph/tests/stream_test.html`
