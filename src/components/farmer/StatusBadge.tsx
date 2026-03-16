import React from "react";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | string;

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/25",
  confirmed:
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25",
  out_for_delivery:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25",
  delivered:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
  cancelled:
    "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const key = (status || "pending").toString();
  const nice = STATUS_LABEL[key] ?? key.split("_").join(" "); // ✅ no replaceAll()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        STATUS_STYLES[key] ?? "bg-muted text-foreground border border-border/60",
        className
      )}
    >
      {nice}
    </span>
  );
}