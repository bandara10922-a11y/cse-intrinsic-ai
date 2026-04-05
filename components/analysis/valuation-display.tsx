"use client";

import React from "react";
import { cn, formatPrice, formatPercent } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ValuationResult } from "@/lib/valuation-models";
import { Info, TrendingUp, TrendingDown, Shield } from "lucide-react";

interface ValuationDisplayProps {
  valuation: ValuationResult;
  marketPrice: number;
}

function signalVariant(signal: string) {
  switch (signal) {
    case "STRONG_BUY": return "strong-buy";
    case "BUY": return "buy";
    case "HOLD": return "hold";
    case "SELL": return "sell";
    case "STRONG_SELL": return "strong-sell";
    default: return "outline";
  }
}

function signalEmoji(signal: string) {
  switch (signal) {
    case "STRONG_BUY": return "🟢🟢";
    case "BUY": return "🟢";
    case "HOLD": return "🟡";
    case "SELL": return "🔴";
    case "STRONG_SELL": return "🔴🔴";
    default: return "⚪";
  }
}

export function ValuationDisplay({ valuation, marketPrice }: ValuationDisplayProps) {
  const isUndervalued = valuation.upsidePercent > 0;

  return (
    <div className="space-y-6">
      {/* Hero metric */}
      <div className="rounded-xl border border-cse-gold/20 bg-gradient-to-br from-cse-gold/5 to-transparent p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-mono">
              Weighted Intrinsic Value
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-cse-gold glow-gold tabular">
                LKR {formatPrice(valuation.weightedAverage)}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                isUndervalued ? "text-signal-strong-buy" : "text-signal-strong-sell"
              )}>
                {isUndervalued ? "↑" : "↓"} {Math.abs(valuation.upsidePercent).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Market Price: LKR {formatPrice(marketPrice)}
              {isUndervalued
                ? ` · ${formatPercent(valuation.upsidePercent)} undervalued`
                : ` · ${formatPercent(Math.abs(valuation.upsidePercent))} overvalued`}
            </p>
          </div>
          <Badge variant={signalVariant(valuation.signal) as any} className="text-sm px-3 py-1.5">
            {signalEmoji(valuation.signal)} {valuation.signal.replace("_", " ")}
          </Badge>
        </div>

        {/* Confidence bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Confidence Score
            </span>
            <span className="font-mono font-semibold text-foreground">
              {(valuation.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={valuation.confidence * 100} className="h-1.5" />
        </div>
      </div>

      {/* Monte Carlo Range */}
      {valuation.mcSimulation && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-mono">
            Monte Carlo Fair Value Range (1,000 simulations)
          </p>
          <div className="flex items-center gap-2">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Bearish (5th %ile)</div>
              <div className="font-mono font-semibold text-signal-strong-sell">
                LKR {formatPrice(valuation.mcSimulation.low)}
              </div>
            </div>
            <div className="flex-1 relative h-8">
              {/* Range bar */}
              <div className="absolute inset-y-2 left-0 right-0 rounded-full bg-gradient-to-r from-signal-strong-sell/30 via-signal-hold/30 to-signal-strong-buy/30" />
              {/* Market price marker */}
              {(() => {
                const range = valuation.mcSimulation.high - valuation.mcSimulation.low;
                const pct = Math.min(100, Math.max(0, ((marketPrice - valuation.mcSimulation.low) / range) * 100));
                return (
                  <div
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="h-8 w-0.5 bg-foreground/50" />
                    <span className="absolute -top-4 text-[10px] text-muted-foreground whitespace-nowrap">
                      Market
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Bullish (95th %ile)</div>
              <div className="font-mono font-semibold text-signal-strong-buy">
                LKR {formatPrice(valuation.mcSimulation.high)}
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-cse-gold font-mono">
              Median: LKR {formatPrice(valuation.mcSimulation.median)}
            </span>
          </div>
        </div>
      )}

      {/* Breakdown table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h4 className="text-sm font-semibold font-display">Model Breakdown</h4>
        </div>
        <div className="divide-y divide-border/50">
          {valuation.breakdown.map((item) => (
            <div key={item.model} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.model}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                    item.reliability === "high" ? "bg-signal-strong-buy/10 text-signal-strong-buy" :
                    item.reliability === "medium" ? "bg-signal-hold/10 text-signal-hold" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {item.reliability}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cse-gold/60 rounded-full"
                      style={{ width: `${(item.weight * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {(item.weight * 100).toFixed(1)}% weight
                  </span>
                </div>
              </div>
              <div className="text-right ml-4">
                {item.value !== null ? (
                  <>
                    <div className="font-mono font-semibold text-sm tabular">
                      LKR {formatPrice(item.value)}
                    </div>
                    <div className={cn(
                      "text-xs font-mono",
                      item.value > marketPrice ? "text-signal-strong-buy" : "text-signal-strong-sell"
                    )}>
                      {item.value > marketPrice ? "+" : ""}{(((item.value - marketPrice) / marketPrice) * 100).toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
