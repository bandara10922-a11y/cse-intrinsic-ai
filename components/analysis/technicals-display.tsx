"use client";

import React from "react";
import { cn, formatPrice } from "@/lib/utils";
import type { TechnicalIndicators } from "@/lib/valuation-models";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface TechnicalsDisplayProps {
  technicals: TechnicalIndicators;
  currentPrice: number;
}

function IndicatorRow({
  label, value, status, description,
}: {
  label: string;
  value: string;
  status?: "bullish" | "bearish" | "neutral";
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/20 px-1 rounded transition-colors group">
      <div>
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground hidden group-hover:block mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm tabular">{value}</span>
        {status && (
          <span className={cn(
            "h-2 w-2 rounded-full",
            status === "bullish" ? "bg-signal-strong-buy" :
            status === "bearish" ? "bg-signal-strong-sell" :
            "bg-signal-hold"
          )} />
        )}
      </div>
    </div>
  );
}

export function TechnicalsDisplay({ technicals, currentPrice }: TechnicalsDisplayProps) {
  const t = technicals;

  const getStatus = (indicator: number | null, above: number | null): "bullish" | "bearish" | "neutral" => {
    if (!indicator || !above) return "neutral";
    return currentPrice > above ? "bullish" : currentPrice < above ? "bearish" : "neutral";
  };

  const rsiStatus = (rsi: number | null): "bullish" | "bearish" | "neutral" => {
    if (!rsi) return "neutral";
    if (rsi < 30) return "bullish"; // oversold = potential buy
    if (rsi > 70) return "bearish"; // overbought = potential sell
    return "neutral";
  };

  return (
    <div className="space-y-4">
      {/* Signal Summary */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border",
        t.technicalSignal === "BUY" ? "border-signal-strong-buy/30 bg-signal-strong-buy/5" :
        t.technicalSignal === "SELL" ? "border-signal-strong-sell/30 bg-signal-strong-sell/5" :
        "border-signal-hold/30 bg-signal-hold/5"
      )}>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Technical Signal</p>
          <div className="flex items-center gap-2">
            {t.technicalSignal === "BUY" ? <TrendingUp className="h-5 w-5 text-signal-strong-buy" /> :
             t.technicalSignal === "SELL" ? <TrendingDown className="h-5 w-5 text-signal-strong-sell" /> :
             <Minus className="h-5 w-5 text-signal-hold" />}
            <span className={cn(
              "text-xl font-display font-bold",
              t.technicalSignal === "BUY" ? "text-signal-strong-buy" :
              t.technicalSignal === "SELL" ? "text-signal-strong-sell" :
              "text-signal-hold"
            )}>
              {t.technicalSignal}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-mono mb-1">Score</p>
          <span className="font-mono font-bold text-xl">
            {t.technicalScore > 0 ? "+" : ""}{t.technicalScore}
          </span>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-center">
            <p className="text-muted-foreground font-mono">Trend</p>
            <p className={cn(
              "font-semibold mt-0.5",
              t.trend === "BULLISH" ? "text-signal-strong-buy" :
              t.trend === "BEARISH" ? "text-signal-strong-sell" : "text-signal-hold"
            )}>{t.trend}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground font-mono">Momentum</p>
            <p className="font-semibold mt-0.5">{t.momentum}</p>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h4 className="text-sm font-semibold font-display">Moving Averages</h4>
        </div>
        <div className="px-4">
          <IndicatorRow
            label="SMA 20"
            value={t.sma20 ? `LKR ${formatPrice(t.sma20)}` : "—"}
            status={getStatus(t.sma20, t.sma20)}
            description="Simple Moving Average (20 days)"
          />
          <IndicatorRow
            label="SMA 50"
            value={t.sma50 ? `LKR ${formatPrice(t.sma50)}` : "—"}
            status={currentPrice && t.sma50 ? (currentPrice > t.sma50 ? "bullish" : "bearish") : "neutral"}
            description="Simple Moving Average (50 days)"
          />
          <IndicatorRow
            label="SMA 200"
            value={t.sma200 ? `LKR ${formatPrice(t.sma200)}` : "—"}
            status={currentPrice && t.sma200 ? (currentPrice > t.sma200 ? "bullish" : "bearish") : "neutral"}
            description="Simple Moving Average (200 days) — Golden/Death Cross"
          />
          <IndicatorRow
            label="EMA 12"
            value={t.ema12 ? `LKR ${formatPrice(t.ema12)}` : "—"}
            description="Exponential Moving Average (12 days)"
          />
          <IndicatorRow
            label="EMA 26"
            value={t.ema26 ? `LKR ${formatPrice(t.ema26)}` : "—"}
            description="Exponential Moving Average (26 days)"
          />
        </div>
      </div>

      {/* Oscillators */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h4 className="text-sm font-semibold font-display">Oscillators</h4>
        </div>
        <div className="px-4">
          {/* RSI with gauge */}
          <div className="py-3 border-b border-border/40">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">RSI (14)</span>
              <span className={cn(
                "font-mono font-semibold tabular",
                t.rsi14 && t.rsi14 > 70 ? "text-signal-strong-sell" :
                t.rsi14 && t.rsi14 < 30 ? "text-signal-strong-buy" :
                "text-foreground"
              )}>
                {t.rsi14 ? t.rsi14.toFixed(1) : "—"}
              </span>
            </div>
            {t.rsi14 && (
              <div className="relative h-2 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-signal-strong-buy via-signal-hold to-signal-strong-sell" />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                  style={{ left: `${t.rsi14}%` }}
                />
              </div>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>Oversold (30)</span>
              <span>Neutral (50)</span>
              <span>Overbought (70)</span>
            </div>
          </div>

          <IndicatorRow
            label="MACD"
            value={t.macd ? t.macd.toFixed(3) : "—"}
            status={t.macd && t.macdSignal ? (t.macd > t.macdSignal ? "bullish" : "bearish") : "neutral"}
            description="Moving Average Convergence Divergence"
          />
          <IndicatorRow
            label="MACD Signal"
            value={t.macdSignal ? t.macdSignal.toFixed(3) : "—"}
            description="MACD 9-day EMA signal line"
          />
          <IndicatorRow
            label="MACD Histogram"
            value={t.macdHistogram ? t.macdHistogram.toFixed(3) : "—"}
            status={t.macdHistogram ? (t.macdHistogram > 0 ? "bullish" : "bearish") : "neutral"}
            description="MACD - Signal line"
          />
          <IndicatorRow
            label="Stochastic %K"
            value={t.stochasticK ? `${t.stochasticK.toFixed(1)}` : "—"}
            status={t.stochasticK ? (t.stochasticK > 80 ? "bearish" : t.stochasticK < 20 ? "bullish" : "neutral") : "neutral"}
            description="Fast Stochastic Oscillator"
          />
        </div>
      </div>

      {/* Bollinger Bands */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h4 className="text-sm font-semibold font-display">Bollinger Bands (20, 2σ)</h4>
        </div>
        <div className="px-4">
          <IndicatorRow label="Upper Band" value={t.bollingerUpper ? `LKR ${formatPrice(t.bollingerUpper)}` : "—"} status="bearish" />
          <IndicatorRow label="Middle (SMA20)" value={t.bollingerMiddle ? `LKR ${formatPrice(t.bollingerMiddle)}` : "—"} status="neutral" />
          <IndicatorRow label="Lower Band" value={t.bollingerLower ? `LKR ${formatPrice(t.bollingerLower)}` : "—"} status="bullish" />
          {t.bollingerUpper && t.bollingerLower && (
            <IndicatorRow
              label="Band Width"
              value={`${(((t.bollingerUpper - t.bollingerLower) / (t.bollingerMiddle ?? 1)) * 100).toFixed(2)}%`}
              description="Bandwidth = (Upper - Lower) / Middle"
            />
          )}
        </div>
      </div>

      {/* Fibonacci Levels */}
      {t.fibLevels && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h4 className="text-sm font-semibold font-display">Fibonacci Retracement (52W)</h4>
          </div>
          <div className="px-4">
            {t.fibLevels.map((fib) => (
              <IndicatorRow
                key={fib.level}
                label={fib.level}
                value={`LKR ${formatPrice(fib.price)}`}
                status={currentPrice >= fib.price ? "bullish" : "neutral"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Volume */}
      {t.atr14 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h4 className="text-sm font-semibold font-display">Volatility</h4>
          </div>
          <div className="px-4">
            <IndicatorRow
              label="ATR (14)"
              value={`LKR ${formatPrice(t.atr14)}`}
              description="Average True Range — daily volatility measure"
            />
            <IndicatorRow
              label="ATR %"
              value={`${((t.atr14 / currentPrice) * 100).toFixed(2)}%`}
              description="ATR as % of current price"
            />
          </div>
        </div>
      )}
    </div>
  );
}
