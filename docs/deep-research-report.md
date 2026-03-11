# LangGraph 单项目流式测试说明（精简版）

此文档只保留与当前仓库直接相关的运行与调试信息。

## 1. 当前测试目标

- 验证 `multi_agent` 图在 LangGraph Dev API 下的流式事件输出是否完整。
- 在 `tests/stream_test.html` 中观察：
  - token/消息增量（`messages` / `messages-tuple`）
  - 状态更新（`updates` / `values`）
  - 执行轨迹事件（`events` / `debug` / `metadata` / `error`）
  - 子图事件（`stream_subgraphs=true`）

## 2. 运行方式

1) 启动 LangGraph 服务：

```bash
uv run python main.py serve
```

2) 打开调试页：

- 推荐：`python -m http.server 8080`
- 打开 `http://127.0.0.1:8080/tests/stream_test.html`

3) 点击：

- `Create Thread`（可选）
- `Start Run`

## 3. 关键配置建议

- `stream_mode` 推荐初始值：`updates,events,messages-tuple`
- `stream_subgraphs`：建议开启，便于观察子图节点
- `assistant_id`：默认可使用 `multi_agent`
- `thread_id`：空时自动创建，便于快速 smoke test

## 4. 排查清单

- 页面无事件：确认 `Base URL` 是否为 `http://127.0.0.1:2024`
- CORS/本地文件限制：改为通过 `http.server` 打开 HTML
- 只有最终答案无中间流：确认 `stream_mode` 未被误改为单一模式
- 子图不显示：确认 `stream_subgraphs` 已开启

## 5. 结论

当前仓库的标准调试入口为：

- Web 可视化：`tests/stream_test.html`
- CLI 流式：`main.py stream`

这两者均直接对接 LangGraph Dev API，不经过额外网关层。
