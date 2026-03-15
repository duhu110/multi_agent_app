"use client";

import Link from "next/link";
import OrbBackground from "@/components/home/orb";
import { Atom } from "lucide-react";

function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-full",
        "border border-white/20",
        "bg-white/12",
        "backdrop-blur-3xl",
        "shadow-[0_4px_20px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.2)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
        "before:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_50%)]",
        className,
      ].join(" ")}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      {/* 全屏背景层：从页面最顶开始铺开，经过 navbar 下方 */}
      <div className="absolute inset-0 z-0">
        <OrbBackground
          hoverIntensity={0.5}
          rotateOnHover
          hue={280}
        />
        {/* 轻微聚焦遮罩，避免内容发灰 */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,3,3,0.06)_38%,rgba(3,3,3,0.24)_72%,rgba(3,3,3,0.52)_100%)]" />
        {/* 顶部额外柔光，让 navbar 玻璃折射更明显，但不发黑 */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[18rem] w-[42rem] -translate-x-1/2 rounded-full bg-white/6 blur-[120px]" />
      </div>

      {/* Navbar：独立浮在背景上方 */}
      <nav className="absolute left-1/2 top-6 z-50 w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2">
        <Glass className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                <Atom className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-wide text-white">
                  React Bits
                </span>
                <span className="text-[11px] text-white/55">
                  Interactive backgrounds
                </span>
              </div>
            </div>

            <button className="hidden md:inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/14">
              Explore
            </button>
          </div>
        </Glass>
      </nav>

      {/* 内容层 */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6">
        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <Glass className="mb-8 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/70"
                >
                  <line x1="4" y1="20" x2="20" y2="4" />
                  <line x1="4" y1="14" x2="14" y2="4" />
                  <line x1="10" y1="20" x2="20" y2="10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-white/85">
                New Background
              </span>
            </div>
          </Glass>

          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] md:text-7xl md:leading-[1.02]">
            <span className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.86)_62%,rgba(255,255,255,0.62)_100%)] bg-clip-text text-transparent">
              This orb is hiding
            </span>
            <br className="hidden md:block" />
            <span className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.92)_52%,rgba(203,213,225,0.72)_100%)] bg-clip-text text-transparent">
              something, try hovering!
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/58 md:text-base">
            Beautiful interactive backgrounds with a brighter glass navigation
            layer floating above the scene.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/test/assistant-ui" className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/95">
              Get Started
            </Link>
            <Glass className="px-1 py-1">
              <button className="rounded-full px-7 py-2.5 text-sm font-semibold text-white/88 transition-all hover:bg-white/5 hover:text-white">
                Learn More
              </button>
            </Glass>
          </div>
        </main>
      </div>
    </div>
  );
}