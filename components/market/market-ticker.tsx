"use client";

import React, { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatPrice, formatPercent } from "@/lib/utils";

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketTickerProps {
  items?: TickerItem[];
}

const DEMO_ITEMS: TickerItem[] = [
  { symbol: "ASPI", price: 12456.78, change: 123.45, changePercent: 1.00 },
  { symbol: "S&P SL20", price: 4321.56, change: -45.23, changePercent: -1.04 },
  { symbol: "COMB.N0000", price: 148.50, change: 2.50, changePercent: 1.71 },
  { symbol: "LOLC.N0000", price: 452.00, change: -8.00, changePercent: -1.74 },
  { symbol: "HNB.N0000", price: 285.00, change: 5.00, changePercent: 1.79 },
  { symbol: "SAMP.N0000", price: 183.75, change: 1.25, changePercent: 0.68 },
  { symbol: "JKH.N0000", price: 275.00, change: -3.50, changePercent: -1.26 },
  { symbol: "LION.N0000", price: 621.00, change: 15.00, changePercent: 2.48 },
  { symbol: "CTC.N0000", price: 1185.00, change: -10.00, changePercent: -0.84 },
  { symbol: "DIPD.N0000", price: 24.50, change: 0.50, changePercent: 2.08 },
];

export function MarketTicker({ items = DEMO_ITEMS }: MarketTickerProps) {
  const [liveItems, setLiveItems] = useState<TickerItem[]>(items);
  const prevPrices = useRef<Map<string, number>>(new Map());
  const [flashMap, setFlashMap] = useState<Map<string, "up" | "down">>(new Map());

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch("/api/market/summary");
        if (!res.ok) return;
        const data = await res.json();
        const newFlash = new Map<string, "up" | "down">();
        const allItems: TickerItem[] = [];

        // Add index items
        if (data.summary) {
          allItems.push(
            { symbol: "ASPI", price: data.summary.aspiIndex, change: data.summary.aspiChange, changePercent: data.summary.aspiChangePercentage },
            { symbol: "S&P SL20", price: data.summary.snpIndex, change: data.summary.snpChange, changePercent: data.summary.snpChangePercentage }
          );
        }

        // Add top movers
        const movers: TickerItem[] = [
          ...(data.gainers ?? []).slice(0, 5).map((g: any) => ({
            symbol: g.symbol, price: g.price, change: g.change, changePercent: g.percentageChange,
          })),
          ...(data.losers ?? []).slice(0, 5).map((l: any) => ({
            symbol: l.symbol, price: l.price, change: l.change, changePercent: l.percentageChange,
          })),
        ];
        allItems.push(...movers);

        // Detect price changes for flashing
        allItems.forEach((item) => {
          const prev = prevPrices.current.get(item.symbol);
          if (prev !== undefined && prev !== item.price) {
            newFlash.set(item.symbol, item.price > prev ? "up" : "down");
          }
          prevPrices.current.set(item.symbol, item.price);
        });

        if (allItems.length > 2) {
          setLiveItems(allItems);
          setFlashMap(newFlash);
          setTimeout(() => setFlashMap(new Map()), 600);
        }
      } catch {
        // Keep demo data on error
      }
    };

    fetchTicker();
    const id = setInterval(fetchTicker, 15000);
    return () => clearInterval(id);
  }, []);

  const doubledItems = [...liveItems, ...liveItems]; // for seamless loop

  return (
    <div className="border-b border-border/40 bg-gradient-to-r from-cse-blue/5 via-background to-cse-gold/5 overflow-hidden">
      <div className="ticker-wrap h-9 flex items-center">
        <div className="ticker-content flex items-center gap-0">
          {doubledItems.map((item, i) => {
            const flash = flashMap.get(item.symbol);
            const isIndex = item.symbol === "ASPI" || item.symbol === "S&P SL20";
            return (
              <React.Fragment key={`${item.symbol}-${i}`}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 text-xs whitespace-nowrap transition-colors rounded",
                    flash === "up" && "flash-up",
                    flash === "down" && "flash-down"
                  )}
                >
                  <span className={cn(
                    "font-display font-semibold",
                    isIndex ? "text-cse-gold" : "text-foreground"
                  )}>
                    {item.symbol}
                  </span>
                  <span className="font-mono tabular text-foreground/90">
                    {formatPrice(item.price)}
                  </span>
                  <span className={cn(
                    "flex items-center gap-0.5 font-mono",
                    item.change > 0 ? "text-signal-strong-buy" : item.change < 0 ? "text-signal-strong-sell" : "text-muted-foreground"
                  )}>
                    {item.change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : item.change < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                    {formatPercent(item.changePercent)}
                  </span>
                </div>
                <span className="text-border/60 px-1">•</span>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
