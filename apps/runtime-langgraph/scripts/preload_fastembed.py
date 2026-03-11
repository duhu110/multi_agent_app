"""
FastEmbed model preloader for LangGraph runtime.

Purpose:
- Pre-download embedding model at build/startup time
- Avoid cold start latency
- Ensure model availability in offline/prod environments

Model: BAAI/bge-small-zh-v1.5
Dim: 384
"""

import os
import sys
import time

MODEL_NAME = os.getenv(
    "FASTEMBED_MODEL",
    "BAAI/bge-small-zh-v1.5",
)

CACHE_DIR = os.getenv(
    "FASTEMBED_CACHE_DIR",
    "/models/fastembed",
)


def main():
    print("🚀 FastEmbed runtime preload starting...")
    print(f"📦 model = {MODEL_NAME}")
    print(f"📁 cache = {CACHE_DIR}")

    try:
        from langchain_community.embeddings import FastEmbedEmbeddings

        t0 = time.time()

        # 👇 关键：实例化即触发下载
        embedder = FastEmbedEmbeddings(
            model_name=MODEL_NAME,
            cache_dir=CACHE_DIR,
        )

        # 👇 可选但推荐：做一次 dummy embed 确保权重 fully ready
        _ = embedder.embed_query("测试加载")

        dt = time.time() - t0
        print(f"✅ FastEmbed ready in {dt:.2f}s")

    except Exception as e:
        print("❌ FastEmbed preload failed:", e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()