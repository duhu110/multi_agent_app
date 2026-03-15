"use client";

import { CheckCircleIcon } from "lucide-react";

type TransactionConfirmationFinalProps = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
};

export function TransactionConfirmationFinal({
  ticker,
  companyName,
  quantity,
  maxPurchasePrice,
}: TransactionConfirmationFinalProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
        <CheckCircleIcon className="size-5" />
        <span className="font-semibold">Purchase Confirmed</span>
      </div>
      <div className="space-y-1 text-sm text-green-800 dark:text-green-300">
        <p>
          <span className="font-medium">Stock:</span> {companyName} ({ticker})
        </p>
        <p>
          <span className="font-medium">Shares:</span> {quantity}
        </p>
        <p>
          <span className="font-medium">Max Price:</span> ${maxPurchasePrice.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
