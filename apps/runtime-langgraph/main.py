from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_URL = "http://127.0.0.1:2024"
DEFAULT_GRAPH_ID = "multi_agent"


def load_env_file(path: Path) -> dict[str, str]:
    env_vars: dict[str, str] = {}
    if not path.exists():
        return env_vars

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_vars[key.strip()] = value.strip()

    return env_vars


def run_langgraph_dev(host: str, port: int, no_reload: bool, open_browser: bool) -> int:
    env = os.environ.copy()
    env.update(load_env_file(PROJECT_ROOT / ".env"))
    env["LANGGRAPH_HOST"] = host
    env["LANGGRAPH_PORT"] = str(port)

    cmd = ["langgraph", "dev"]
    if no_reload:
        cmd.append("--no-reload")
    if not open_browser:
        cmd.append("--no-browser")

    print(f"Starting LangGraph dev server at {host}:{port}")
    print("Press Ctrl+C to stop.")

    try:
        return subprocess.call(cmd, cwd=PROJECT_ROOT, env=env)
    except FileNotFoundError:
        print("`langgraph` command not found. Install langgraph-cli first.")
        return 127


async def stream_run(
    url: str,
    assistant_id: str,
    prompt: str,
    thread_id: str | None,
    user_id: str,
    stream_mode: list[str],
    stream_subgraphs: bool,
) -> None:
    from langgraph_sdk import get_client

    client = get_client(url=url)

    payload = {
        "user_id": user_id,
        "messages": [{"role": "human", "content": prompt}],
    }

    if thread_id:
        payload["thread_id"] = thread_id

    print(f"Connect: {url}")
    print(f"Assistant/Graph: {assistant_id}")
    print(f"Thread: {thread_id or '(threadless)'}")
    print(f"stream_mode: {stream_mode}")
    print(f"stream_subgraphs: {stream_subgraphs}")
    print("\nStreaming events:\n")

    async for chunk in client.runs.stream(
        thread_id,
        assistant_id,
        input=payload,
        stream_mode=stream_mode,
        stream_subgraphs=stream_subgraphs,
    ):
        print(f"[event] {chunk.event}")
        print(chunk.data)
        print()


def parse_stream_modes(raw: str) -> list[str]:
    if not raw.strip():
        return ["updates", "messages", "custom"]

    modes = [part.strip() for part in raw.split(",") if part.strip()]
    return modes or ["updates", "messages", "custom"]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="LangGraph single-project launcher and stream tester",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="start langgraph dev")
    serve.add_argument("--host", default="127.0.0.1", help="bind host")
    serve.add_argument("--port", type=int, default=2024, help="bind port")
    serve.add_argument("--no-reload", action="store_true", help="disable auto reload")
    serve.add_argument(
        "--browser",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="open browser automatically on startup (default: false)",
    )

    stream = sub.add_parser("stream", help="stream run events from langgraph server")
    stream.add_argument("--url", default=DEFAULT_URL, help="langgraph server url")
    stream.add_argument(
        "--assistant-id",
        default=DEFAULT_GRAPH_ID,
        help="assistant id (or graph id in langgraph dev)",
    )
    stream.add_argument("--thread-id", default=None, help="existing thread id (optional)")
    stream.add_argument("--user-id", default="u1", help="user id passed into graph state")
    stream.add_argument(
        "--stream-mode",
        default="updates,messages,custom",
        help="comma separated stream modes, e.g. updates,messages,custom",
    )
    stream.add_argument(
        "--stream-subgraphs",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="include subgraph events",
    )
    stream.add_argument(
        "--prompt",
        default="What is LangGraph?",
        help="human input prompt",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "serve":
        return run_langgraph_dev(args.host, args.port, args.no_reload, args.browser)

    if args.command == "stream":
        stream_modes = parse_stream_modes(args.stream_mode)
        try:
            asyncio.run(
                stream_run(
                    url=args.url,
                    assistant_id=args.assistant_id,
                    prompt=args.prompt,
                    thread_id=args.thread_id,
                    user_id=args.user_id,
                    stream_mode=stream_modes,
                    stream_subgraphs=args.stream_subgraphs,
                )
            )
            return 0
        except ModuleNotFoundError as err:
            if err.name == "langgraph_sdk":
                print("Missing dependency: langgraph_sdk")
                print("Run `uv sync` and use `uv run python main.py stream ...`.")
                return 1
            raise
        except KeyboardInterrupt:
            print("\nInterrupted.")
            return 130

    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
