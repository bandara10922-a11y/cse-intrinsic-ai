"use client";

import React, { useEffect, useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import {
  Twitter, ExternalLink, TrendingUp, TrendingDown, Minus,
  Newspaper, MessageCircle, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SentimentItem {
  id?: number;
  source: string;
  platform: string;
  content: string;
  author?: string;
  url?: string;
  sentiment: string;
  sentimentScore: number;
  publishedAt: string;
  reach?: number;
  symbol?: string;
}

interface SentimentSummary {
  avgScore: number;
  positive: number;
  negative: number;
  neutral: number;
  totalItems: number;
  trend: string;
}

interface SentimentFeedProps {
  symbol?: string;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  const p = platform?.toLowerCase();
  if (p === "twitter" || p === "x") return <Twitter className="h-3.5 w-3.5" />;
  if (p === "dailyft" || p === "economynext" || p === "lbo") return <Newspaper className="h-3.5 w-3.5" />;
  return <MessageCircle className="h-3.5 w-3.5" />;
};

const SentimentIcon = ({ score }: { score: number }) => {
  if (score > 0.1) return <TrendingUp className="h-4 w-4 text-signal-strong-buy" />;
  if (score < -0.1) return <TrendingDown className="h-4 w-4 text-signal-strong-sell" />;
  return <Minus className="h-4 w-4 text-signal-hold" />;
};

function SentimentBar({ summary }: { summary: SentimentSummary }) {
  const total = summary.totalItems || 1;
  const posW = (summary.positive / total) * 100;
  const negW = (summary.negative / total) * 100;
  const neuW = (summary.neutral / total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Market Sentiment</span>
        <Badge variant={summary.trend === "bullish" ? "strong-buy" : summary.trend === "bearish" ? "strong-sell" : "hold"}>
          {summary.trend === "bullish" ? "🐂 BULLISH" : summary.trend === "bearish" ? "🐻 BEARISH" : "😐 NEUTRAL"}
        </Badge>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        <div className="bg-signal-strong-buy transition-all" style={{ width: `${posW}%` }} />
        <div className="bg-signal-hold transition-all" style={{ width: `${neuW}%` }} />
        <div className="bg-signal-strong-sell transition-all" style={{ width: `${negW}%` }} />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span className="text-signal-strong-buy">▲ {summary.positive} positive</span>
        <span className="text-signal-hold">— {summary.neutral} neutral</span>
        <span className="text-signal-strong-sell">▼ {summary.negative} negative</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{summary.totalItems} total signals</span>
        <span className={cn(
          "font-mono font-semibold",
          summary.avgScore > 0 ? "text-signal-strong-buy" :
          summary.avgScore < 0 ? "text-signal-strong-sell" :
          "text-signal-hold"
        )}>
          Avg Score: {summary.avgScore > 0 ? "+" : ""}{summary.avgScore.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

export function SentimentFeed({ symbol }: SentimentFeedProps) {
  const [items, setItems] = useState<SentimentItem[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSentiment = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (symbol) params.set("symbol", symbol);
      if (refresh) params.set("refresh", "true");
      const res = await fetch(`/api/sentiment?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setSummary(data.summary ?? null);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
    const id = setInterval(() => fetchSentiment(), 60000);
    return () => clearInterval(id);
  }, [symbol]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-16 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <SentimentBar summary={summary} />
        </div>
      )}

      {/* Live feed header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold font-display flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-strong-buy animate-pulse" />
          Live Feed
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fetchSentiment(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </Button>
      </div>

      {/* Feed items */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No sentiment data available</p>
            <p className="text-xs mt-1">Configure API keys in .env.local</p>
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id ?? i}
              className={cn(
                "rounded-lg border p-3 text-sm transition-all hover:bg-muted/20",
                item.sentiment === "positive" ? "border-signal-strong-buy/20 bg-signal-strong-buy/3" :
                item.sentiment === "negative" ? "border-signal-strong-sell/20 bg-signal-strong-sell/3" :
                "border-border/60 bg-card/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <SentimentIcon score={item.sentimentScore} />
                  <PlatformIcon platform={item.platform} />
                  <span className="text-xs text-muted-foreground capitalize font-medium">
                    {item.platform}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.reach && item.reach > 100 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.reach.toLocaleString()} reach
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {timeAgo(item.publishedAt)}
                  </span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-foreground/90 leading-relaxed line-clamp-2">
                {item.content}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  item.sentiment === "positive" ? "bg-signal-strong-buy/10 text-signal-strong-buy" :
                  item.sentiment === "negative" ? "bg-signal-strong-sell/10 text-signal-strong-sell" :
                  "bg-muted text-muted-foreground"
                )}>
                  {item.sentiment} ({item.sentimentScore > 0 ? "+" : ""}{item.sentimentScore.toFixed(3)})
                </span>
                {item.symbol && symbol !== item.symbol && (
                  <span className="text-[10px] text-cse-gold font-mono">{item.symbol}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
