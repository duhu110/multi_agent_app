# 会话纪要（2026-03-11）

## 背景

本次会话目标是把当前仓库收敛为**单独的 LangGraph 测试项目**，并提供可直接用于多智能体流式观测的 HTML 页面与启动方式。

## 已完成事项

1. 明确项目边界

- 确认为「LangGraph 单项目」，不再按 FastAPI 网关方案推进。
- 清理文档中与当前仓库无关的历史描述（如外部项目路径、网关方案等）。

2. 测试页面调整

- `apps/runtime-langgraph/tests/stream_test.html` 已升级为完整流式调试页，支持：
  - SSE 事件时间线
  - 消息/token 输出区域
  - 事件类型过滤（updates/messages/events/debug/metadata/error/custom 等）
  - 子图流式事件展示
- 页面访问路径统一为：
  - `http://127.0.0.1:8080/apps/runtime-langgraph/tests/stream_test.html`

3. 启动方式调整

- `main.py` 改为统一 CLI：
  - `serve`：启动 LangGraph Dev Server
  - `stream`：基于 `langgraph_sdk` 做命令行流式测试
- `serve` 默认关闭自动浏览器（`--no-browser`），避免 `_open_browser` 线程报错干扰。
- 可选：`--no-reload` 关闭热重载，减少 `watchfiles` 日志噪音。

4. 相关文档更新

- `docs/README.md`：更新为单项目快速启动与测试指引。
- `docs/deep-research-report.md`：精简为当前仓库可执行的流式测试说明。
- `scripts/README.md`：同步为 LangGraph 单项目脚本说明。

## 运行验证与问题定位结论

1. 日志里 `Application started up` 说明服务已启动成功。
2. `Exception in thread Thread-3 (_open_browser)` 仅是自动开浏览器失败，不影响 API 可用性。
3. `3 changes detected` 为热重载文件监听日志，不是服务故障。
4. 页面打不开的直接原因是 `8080` 未启动静态文件服务，而非 `apps/runtime-langgraph/tests/stream_test.html` 文件不存在。

## 页面事件解析结论（关键）

问题：真正页面展示时是否只需要解析 `updates`？

结论：**不建议只解析 `updates`**。

建议最少解析以下事件：

- `messages` / `messages-tuple`：实时 token/消息输出（主聊天区）
- `updates`：状态增量、路由与节点中间结果
- `events`（或 `debug`）：执行时间线、步骤轨迹
- `metadata`：`run_id` / `thread_id` 关联
- `error` / `end`：错误与完成状态
- `custom`（可选）：业务自定义埋点

推荐配置：

- `stream_mode=updates,events,messages-tuple,custom`
- `stream_subgraphs=true`

## 当前推荐操作命令

启动 LangGraph 服务：

```bash
cd apps/runtime-langgraph && uv run python main.py serve --no-reload
```

启动静态页面服务：

```bash
python3 -m http.server 8080
```

打开测试页：

- `http://127.0.0.1:8080/apps/runtime-langgraph/tests/stream_test.html`

