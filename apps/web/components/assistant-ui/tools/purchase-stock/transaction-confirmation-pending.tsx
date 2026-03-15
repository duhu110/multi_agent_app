"use client";

import { Button } from "@/components/ui/button";

type TransactionConfirmationPendingProps = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
  onConfirm: () => void;
  onReject: () => void;
};

export function TransactionConfirmationPending({
  ticker,
  companyName,
  quantity,
  maxPurchasePrice,
  onConfirm,
  onReject,
}: TransactionConfirmationPendingProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="font-semibold">Confirm Purchase</h3>
        <p className="text-sm text-muted-foreground">
          Please review and confirm the following transaction:
        </p>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
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
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onReject}
        >
          Reject
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
