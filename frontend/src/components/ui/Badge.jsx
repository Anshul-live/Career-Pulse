import React from "react";
import { cn } from "../../lib/utils";

const statusConfig = {
  applied: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    label: "Applied",
  },
  interview: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
    label: "Interview",
  },
  assessment: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "Assessment",
  },
  offer: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Offer",
  },
  rejected: {
    bg: "bg-rose-500/20",
    text: "text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    label: "Rejected",
  },
  closed: {
    bg: "bg-zinc-500/20",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
    dot: "bg-zinc-500",
    label: "Closed",
  },
  unknown: {
    bg: "bg-zinc-500/20",
    text: "text-zinc-500",
    border: "border-zinc-500/30",
    dot: "bg-zinc-500",
    label: "Unknown",
  },
};

export function Badge({ status, children, className, showDot = true }) {
  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      )}
      {children || config.label}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  return <Badge status={status} className={className} />;
}

export { statusConfig };
