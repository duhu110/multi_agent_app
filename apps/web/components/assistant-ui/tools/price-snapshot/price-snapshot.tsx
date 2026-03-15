"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PriceSnapshotProps = {
  ticker: string;
  price: number;
  day_change: number;
  day_change_percent: number;
  time: string;
};

export function PriceSnapshot({
  ticker,
  price,
  day_change,
  day_change_percent,
  time,
}: PriceSnapshotProps) {
  const isPositive = day_change >= 0;

  return (
    <div className="flex w-full max-w-sm flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{ticker}</span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-semibold">
          ${price.toFixed(2)}
        </span>
        <div
          className={cn(
            "mb-1 flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {isPositive ? (
            <TrendingUpIcon className="size-4" />
          ) : (
            <TrendingDownIcon className="size-4" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {day_change.toFixed(2)} ({isPositive ? "+" : ""}
            {day_change_percent.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
