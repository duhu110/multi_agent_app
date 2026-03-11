# Multi-Agent (LangGraph Single Project)

这个仓库是一个纯 **LangGraph** 的多智能体测试项目。

## 项目目标

- 用主图（router/synthesize）调度 4 个子智能体：`rag` / `web` / `sql` / `action`
- 支持 LangGraph Dev API 的流式事件（`updates / messages-tuple / events / custom`）
- 用本地 HTML 页面直接调试，观察接近 LangSmith 的事件流效果

## 目录结构

- `multi_agent/agent.py`：主图构建与子图调度入口
- `multi_agent/agents/*`：各子智能体子图
- `tests/stream_test.html`：前端流式调试页（主入口）
- `main.py`：统一 CLI（启动服务 + SDK 流式测试）
- `langgraph.json`：LangGraph graph 注册（`multi_agent`）

## 文档索引

- `deep-research-report.md`：单项目流式测试说明（精简版）
- `conversation-summary-2026-03-11.md`：本次对话纪要与变更总结

## 快速开始

1. 安装依赖

```bash
uv sync
```

2. 启动 LangGraph Dev Server（推荐）

```bash
uv run python main.py serve --host 127.0.0.1 --port 2024
```

如果你不希望热重载日志持续输出，可使用：

```bash
uv run python main.py serve --no-reload
```

3. 打开流式测试页

- 直接打开文件：`tests/stream_test.html`
- 如果浏览器限制 `file://` 跨域，先启动静态服务：

```bash
python -m http.server 8080
```

然后访问：

`http://127.0.0.1:8080/tests/stream_test.html`

4. 页面默认配置

- Base URL: `http://127.0.0.1:2024`
- Graph ID: `multi_agent`
- Assistant UUID 留空时会回退到 `graph_id`

## 命令行流式调试（可选）

不使用 HTML 时，可以直接用 SDK 流式输出：

```bash
uv run python main.py stream --prompt "请解释当前多智能体路由策略"
```

可选参数：

- `--url`：LangGraph 服务地址
- `--assistant-id`：assistant/graph id
- `--thread-id`：指定已有线程
- `--stream-mode`：如 `updates,messages,custom`
- `--stream-subgraphs / --no-stream-subgraphs`

## 注意

- 文档内容只覆盖当前单项目 LangGraph 测试场景。
