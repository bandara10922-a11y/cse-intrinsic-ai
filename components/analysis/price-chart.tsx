"use client";

import React, { useState } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChartDataPoint {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

interface PriceChartProps {
  data: ChartDataPoint[];
  symbol: string;
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  bollingerUpper?: number | null;
  bollingerLower?: number | null;
}

const PERIODS = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs font-mono">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Close</span>
          <span className="text-foreground font-semibold">LKR {formatPrice(d?.close ?? 0)}</span>
        </div>
        {d?.open && <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Open</span>
          <span>LKR {formatPrice(d.open)}</span>
        </div>}
        {d?.high && <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">High</span>
          <span className="text-signal-strong-buy">LKR {formatPrice(d.high)}</span>
        </div>}
        {d?.low && <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Low</span>
          <span className="text-signal-strong-sell">LKR {formatPrice(d.low)}</span>
        </div>}
        {d?.volume && <div className="flex justify-between gap-4 pt-1 border-t border-border/50 mt-1">
          <span className="text-muted-foreground">Volume</span>
          <span>{d.volume.toLocaleString()}</span>
        </div>}
      </div>
    </div>
  );
};

export function PriceChart({
  data, symbol, sma20, sma50, bollingerUpper, bollingerLower,
}: PriceChartProps) {
  const [period, setPeriod] = useState("3M");
  const [showVolume, setShowVolume] = useState(true);
  const [showSMAs, setShowSMAs] = useState(true);

  // Filter data by period
  const filteredData = React.useMemo(() => {
    if (!data.length) return [];
    const now = new Date();
    const cutoffs: Record<string, Date> = {
      "1W": new Date(now.getTime() - 7 * 86400000),
      "1M": new Date(now.getTime() - 30 * 86400000),
      "3M": new Date(now.getTime() - 90 * 86400000),
      "6M": new Date(now.getTime() - 180 * 86400000),
      "1Y": new Date(now.getTime() - 365 * 86400000),
      "ALL": new Date(0),
    };
    const cutoff = cutoffs[period] ?? cutoffs["3M"];
    return data.filter((d) => new Date(d.date) >= cutoff);
  }, [data, period]);

  const isPositive = filteredData.length >= 2
    ? filteredData[filteredData.length - 1].close >= filteredData[0].close
    : true;

  const gradientId = `price-gradient-${symbol}`;

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 px-2.5 text-xs", period === p && "bg-cse-blue text-white")}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className={cn("px-2 py-1 rounded transition-colors", showSMAs ? "text-cse-gold" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setShowSMAs(!showSMAs)}
          >
            SMAs
          </button>
          <button
            className={cn("px-2 py-1 rounded transition-colors", showVolume ? "text-cse-blue-light" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setShowVolume(!showVolume)}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Main chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#00C853" : "#D50000"} stopOpacity={0.15} />
                <stop offset="95%" stopColor={isPositive ? "#00C853" : "#D50000"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v)}
              domain={["auto", "auto"]}
              width={70}
            />
            {showVolume && (
              <YAxis
                yAxisId="volume"
                orientation="left"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                width={40}
              />
            )}
            <Tooltip content={<CustomTooltip />} />

            {/* Volume bars */}
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="hsl(var(--primary))"
                opacity={0.2}
                radius={[1, 1, 0, 0]}
              />
            )}

            {/* Price area */}
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke={isPositive ? "#00C853" : "#D50000"}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />

            {/* SMAs */}
            {showSMAs && sma20 && (
              <Line
                yAxisId="price"
                type="monotone"
                data={filteredData.map((d, i) => ({ ...d, sma20: sma20[i] }))}
                dataKey="sma20"
                stroke="#C8922A"
                strokeWidth={1}
                dot={false}
                strokeDasharray="3 3"
              />
            )}
            {showSMAs && sma50 && (
              <Line
                yAxisId="price"
                type="monotone"
                data={filteredData.map((d, i) => ({ ...d, sma50: sma50[i] }))}
                dataKey="sma50"
                stroke="#0047CC"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 5"
              />
            )}

            {/* Bollinger Bands */}
            {bollingerUpper && (
              <ReferenceLine
                yAxisId="price"
                y={bollingerUpper}
                stroke="#F0B429"
                strokeOpacity={0.5}
                strokeDasharray="2 4"
                label={{ value: `BB+`, position: "right", fontSize: 9, fill: "#F0B429" }}
              />
            )}
            {bollingerLower && (
              <ReferenceLine
                yAxisId="price"
                y={bollingerLower}
                stroke="#F0B429"
                strokeOpacity={0.5}
                strokeDasharray="2 4"
                label={{ value: `BB-`, position: "right", fontSize: 9, fill: "#F0B429" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <span className={cn("h-0.5 w-4 inline-block", isPositive ? "bg-signal-strong-buy" : "bg-signal-strong-sell")} />
          Close
        </span>
        {showSMAs && (
          <>
            <span className="flex items-center gap-1">
              <span className="h-px w-4 inline-block bg-cse-gold border-dashed border-t border-cse-gold" />
              SMA 20
            </span>
            <span className="flex items-center gap-1">
              <span className="h-px w-4 inline-block bg-cse-blue-light border-dashed border-t border-cse-blue-light" />
              SMA 50
            </span>
          </>
        )}
      </div>
    </div>
  );
}
