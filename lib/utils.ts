import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLKR(value: number, decimals = 2): string {
  if (value >= 1_000_000_000) {
    return `LKR ${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `LKR ${(value / 1_000).toFixed(1)}K`;
  }
  return `LKR ${value.toFixed(decimals)}`;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getSignalColor(signal: string): string {
  switch (signal) {
    case "STRONG_BUY": return "text-signal-strong-buy";
    case "BUY": return "text-signal-buy";
    case "HOLD": return "text-signal-hold";
    case "SELL": return "text-signal-sell";
    case "STRONG_SELL": return "text-signal-strong-sell";
    default: return "text-muted-foreground";
  }
}

export function getSignalClass(signal: string): string {
  switch (signal) {
    case "STRONG_BUY": return "signal-strong-buy";
    case "BUY": return "signal-buy";
    case "HOLD": return "signal-hold";
    case "SELL": return "signal-sell";
    case "STRONG_SELL": return "signal-strong-sell";
    default: return "";
  }
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-signal-strong-buy";
  if (value < 0) return "text-signal-strong-sell";
  return "text-muted-foreground";
}
