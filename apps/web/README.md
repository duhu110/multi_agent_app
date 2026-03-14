# web

Next.js 前端目录。

## Assistant UI 测试页（第一阶段）

路径：`/test/assistant-ui`

对应文件：`app/test/assistant-ui/page.tsx`

### 环境变量

在 `apps/web/.env.local` 中配置：

```bash
NEXT_PUBLIC_LANGGRAPH_API_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=
NEXT_PUBLIC_LANGGRAPH_GRAPH_ID=multi_agent
```

### 启动

```bash
npm run dev
```

打开：`http://127.0.0.1:3000/test/assistant-ui`
