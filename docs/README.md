# Multi-Agent App 文档总览

本仓库已演进为多应用目录结构：

- `apps/runtime-langgraph`：当前可运行的 LangGraph 多智能体项目
- `apps/gateway-api`：预留 FastAPI 网关骨架（仅目录，不含业务代码）
- `apps/web`：预留 UI 控制台骨架（仅目录，不含业务代码）
- `infra/docker`：仅保留本地 `db` 与 `vector` 基础设施目录

## 文档索引

- `architecture/evolved-structure.md`：演进后目录结构与迁移说明
- `deep-research-report.md`：单项目流式测试说明（精简版）
- `conversation-summary-2026-03-11.md`：会话纪要与结论

## 当前可运行部分（runtime-langgraph）

## 一键环境初始化（推荐）

在仓库根目录执行：

```bash
bash scripts/init_env.sh
```

该脚本会：

- 检查 `python3` 是否存在
- 若检测到 `uv`，自动执行 `apps/runtime-langgraph` 的依赖同步
- 若检测到 `bun` 或 `npm`，自动安装 `apps/web` 依赖

1. 进入运行时目录

```bash
cd apps/runtime-langgraph
```

2. 安装依赖并启动 LangGraph Dev

```bash
uv sync
uv run python main.py serve --no-reload
```

3. 在仓库根目录启动静态服务并打开测试页

```bash
python3 -m http.server 8080
```

- 打开：`http://127.0.0.1:8080/apps/runtime-langgraph/tests/stream_test.html`
- 页面默认 Base URL：`http://127.0.0.1:2024`
- Graph ID：`multi_agent`

## 说明

- 本次重构按当前阶段需求，未创建 `packages` 共享代码目录。
- 本次重构按当前阶段需求，未创建 CI/CD 目录与流水线。
- `infra` 仅包含本地数据库与向量化相关目录，暂不引入 k8s。
