"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn, formatPrice, formatPercent, formatVolume, getSignalClass } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  signal?: string;
  upsidePercent?: number;
  intrinsicValue?: number;
  rank?: number;
  compact?: boolean;
}

export function StockCard({
  symbol, name, price, change, changePercent, volume,
  signal, upsidePercent, intrinsicValue, rank, compact = false,
}: StockCardProps) {
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <Link href={`/stock/${symbol}`} className="group block">
      <div className={cn(
        "relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm",
        "hover:border-cse-blue/40 hover:bg-card hover:shadow-lg hover:shadow-cse-blue/5",
        "transition-all duration-200",
        compact ? "p-3" : "p-4"
      )}>
        {/* Rank badge */}
        {rank && (
          <span className="absolute top-3 right-3 text-xs font-mono text-muted-foreground/50">
            #{rank}
          </span>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Symbol */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-display font-bold text-sm text-foreground truncate">
                {symbol.replace(".N0000", "").replace(".X0000", "")}
              </span>
              {signal && (
                <Badge className={cn("text-[10px] px-1.5 py-0", getSignalClass(signal))}>
                  {signal.replace("_", " ")}
                </Badge>
              )}
            </div>
            {/* Company name */}
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{name}</p>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-semibold text-sm tabular text-foreground">
              {formatPrice(price)}
            </div>
            <div className={cn(
              "flex items-center justify-end gap-0.5 text-xs font-mono",
              isUp ? "text-signal-strong-buy" : isDown ? "text-signal-strong-sell" : "text-muted-foreground"
            )}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {formatPercent(changePercent)}
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              {volume !== undefined && (
                <span className="font-mono">{formatVolume(volume)} vol</span>
              )}
              {intrinsicValue && (
                <span className="font-mono">
                  IV: <span className="text-cse-gold">{formatPrice(intrinsicValue)}</span>
                </span>
              )}
            </div>
            {upsidePercent !== undefined && (
              <span className={cn(
                "font-mono font-medium",
                upsidePercent >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell"
              )}>
                {upsidePercent >= 0 ? "↑" : "↓"} {Math.abs(upsidePercent).toFixed(1)}% upside
              </span>
            )}
          </div>
        )}

        {/* Hover arrow */}
        <ArrowRight className="absolute right-3 bottom-3 h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all translate-x-1 group-hover:translate-x-0" />
      </div>
    </Link>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
export function StockCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-card/40",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-20 skeleton rounded" />
          <div className="h-3 w-32 skeleton rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-4 w-16 skeleton rounded ml-auto" />
          <div className="h-3 w-12 skeleton rounded ml-auto" />
        </div>
      </div>
      {!compact && <div className="mt-3 h-3 w-full skeleton rounded" />}
    </div>
  );
}
