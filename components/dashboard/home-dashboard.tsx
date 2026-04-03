"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Activity, Zap, BarChart2,
  RefreshCw, ArrowUpRight, Globe, Clock,
} from "lucide-react";
import { cn, formatLKR, formatPercent, formatPrice, getSignalClass } from "@/lib/utils";
import { StockCard, StockCardSkeleton } from "@/components/market/stock-card";
import { AnnouncementsPanel } from "@/components/market/announcements-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({
  label, value, change, changePercent, icon: Icon, highlight = false,
}: {
  label: string; value: string; change?: number;
  changePercent?: number; icon: React.ElementType; highlight?: boolean;
}) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all hover:shadow-md",
      highlight
        ? "border-cse-gold/30 bg-gradient-to-br from-cse-gold/8 to-transparent"
        : "border-border/60 bg-card/60"
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        <Icon className={cn("h-4 w-4", highlight ? "text-cse-gold" : "text-muted-foreground")} />
      </div>
      <div className="font-display text-2xl font-bold tabular text-foreground mb-1">{value}</div>
      {changePercent !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-mono",
          isUp ? "text-signal-strong-buy" : "text-signal-strong-sell"
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatPercent(changePercent)} today
        </div>
      )}
    </div>
  );
}

// ─── Index chart mini ───────────────────────────────────────────────────────
function IndexMiniChart({ data, color }: { data: { value: number }[]; color: string }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="value"
          stroke={color} strokeWidth={1.5}
          fill={`url(#grad-${color})`} dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, subtitle, href,
}: {
  icon: React.ElementType; title: string; subtitle?: string; href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface MarketData {
  summary: {
    isMarketOpen: boolean; aspiIndex: number; aspiChange: number;
    aspiChangePercentage: number; snpIndex: number; snpChange: number;
    snpChangePercentage: number; totalTurnover: number; totalVolume: number;
    totalTrades: number; advancers: number; decliners: number; unchanged: number;
  } | null;
  gainers: any[];
  losers: any[];
  mostActive: any[];
}

export function HomeDashboard() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [aspiHistory, setAspiHistory] = useState<{ value: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/market/summary");
      const json: MarketData = await res.json();
      setData(json);
      setLastUpdated(new Date());
      if (json.summary) {
        setAspiHistory((prev) => [
          ...prev.slice(-59),
          { value: json.summary!.aspiIndex },
        ]);
      }
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const s = data?.summary;

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">

      {/* ── Hero / Index Overview ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Colombo Stock Exchange
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Real-time intelligence · Intrinsic value analysis · AI sentiment
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            {lastUpdated && (
              <>
                <Clock className="h-3 w-3" />
                {lastUpdated.toLocaleTimeString()}
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchData}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* ASPI */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-xl border border-cse-blue/20 bg-gradient-to-br from-cse-blue/8 to-transparent p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">ASPI Index</p>
                {loading ? (
                  <div className="h-8 w-32 skeleton rounded mt-1" />
                ) : (
                  <p className="font-display text-3xl font-bold tabular mt-1">
                    {s ? formatPrice(s.aspiIndex) : "—"}
                  </p>
                )}
                {s && (
                  <p className={cn(
                    "text-sm font-mono mt-0.5 flex items-center gap-1",
                    s.aspiChange >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell"
                  )}>
                    {s.aspiChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {formatPercent(s.aspiChangePercentage)} ({s.aspiChange >= 0 ? "+" : ""}{formatPrice(s.aspiChange)})
                  </p>
                )}
              </div>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                s?.isMarketOpen ? "bg-signal-strong-buy/20" : "bg-muted"
              )}>
                <Activity className={cn("h-4 w-4", s?.isMarketOpen ? "text-signal-strong-buy" : "text-muted-foreground")} />
              </div>
            </div>
            <IndexMiniChart data={aspiHistory} color={s?.aspiChange && s.aspiChange >= 0 ? "#00C853" : "#D50000"} />
          </div>

          {/* S&P SL20 */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-xl border border-border/60 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">S&P SL20</p>
            {loading ? (
              <div className="h-8 w-28 skeleton rounded mt-1" />
            ) : (
              <p className="font-display text-3xl font-bold tabular mt-1">
                {s ? formatPrice(s.snpIndex) : "—"}
              </p>
            )}
            {s && (
              <p className={cn(
                "text-sm font-mono mt-0.5 flex items-center gap-1",
                s.snpChange >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell"
              )}>
                {s.snpChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {formatPercent(s.snpChangePercentage)}
              </p>
            )}
          </div>

          {/* Market Stats */}
          <MetricCard
            label="Turnover"
            value={s ? formatLKR(s.totalTurnover) : "—"}
            icon={BarChart2}
          />
          <MetricCard
            label="Advancers / Decliners"
            value={s ? `${s.advancers} / ${s.decliners}` : "—"}
            icon={TrendingUp}
            highlight={s ? s.advancers > s.decliners : false}
          />
          <MetricCard
            label="Total Trades"
            value={s ? s.totalTrades.toLocaleString() : "—"}
            icon={Zap}
          />
          <MetricCard
            label="Volume"
            value={s ? formatLKR(s.totalVolume) : "—"}
            icon={Globe}
          />
        </div>
      </section>

      {/* ── Main 3-column grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Gainers + Losers */}
        <div className="space-y-6">
          {/* Top Gainers */}
          <section>
            <SectionHeader
              icon={TrendingUp}
              title="Top Gainers"
              subtitle="Best performers today"
              href="/stocks?sort=gainers"
            />
            <div className="space-y-2">
              {loading
                ? Array(5).fill(0).map((_, i) => <StockCardSkeleton key={i} compact />)
                : (data?.gainers ?? []).slice(0, 5).map((s: any, i: number) => (
                  <StockCard
                    key={s.symbol}
                    symbol={s.symbol}
                    name={s.name ?? s.symbol}
                    price={s.price}
                    change={s.change}
                    changePercent={s.percentageChange}
                    volume={s.volume}
                    rank={i + 1}
                    compact
                  />
                ))
              }
            </div>
          </section>

          {/* Top Losers */}
          <section>
            <SectionHeader
              icon={TrendingDown}
              title="Top Losers"
              subtitle="Biggest drops today"
              href="/stocks?sort=losers"
            />
            <div className="space-y-2">
              {loading
                ? Array(5).fill(0).map((_, i) => <StockCardSkeleton key={i} compact />)
                : (data?.losers ?? []).slice(0, 5).map((s: any, i: number) => (
                  <StockCard
                    key={s.symbol}
                    symbol={s.symbol}
                    name={s.name ?? s.symbol}
                    price={s.price}
                    change={s.change}
                    changePercent={s.percentageChange}
                    volume={s.volume}
                    rank={i + 1}
                    compact
                  />
                ))
              }
            </div>
          </section>
        </div>

        {/* Center: Most Active */}
        <div className="space-y-6">
          <section>
            <SectionHeader
              icon={Activity}
              title="Most Active"
              subtitle="Highest volume today"
              href="/stocks?sort=active"
            />
            <div className="space-y-2">
              {loading
                ? Array(8).fill(0).map((_, i) => <StockCardSkeleton key={i} compact />)
                : (data?.mostActive ?? []).slice(0, 8).map((s: any, i: number) => (
                  <StockCard
                    key={s.symbol}
                    symbol={s.symbol}
                    name={s.name ?? s.symbol}
                    price={s.price}
                    change={s.change}
                    changePercent={s.percentageChange}
                    volume={s.volume}
                    rank={i + 1}
                    compact
                  />
                ))
              }
            </div>
          </section>
        </div>

        {/* Right: Announcements */}
        <div>
          <AnnouncementsPanel />
        </div>
      </div>

      {/* ── Market breadth ────────────────────────────────────────────── */}
      {s && (
        <section>
          <SectionHeader icon={BarChart2} title="Market Breadth" />
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-signal-strong-buy font-semibold">
                {s.advancers} Advancing
              </span>
              <span className="text-muted-foreground">
                {s.unchanged} Unchanged
              </span>
              <span className="text-signal-strong-sell font-semibold">
                {s.decliners} Declining
              </span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {(() => {
                const total = (s.advancers + s.decliners + s.unchanged) || 1;
                return (
                  <>
                    <div className="bg-signal-strong-buy" style={{ width: `${(s.advancers / total) * 100}%` }} />
                    <div className="bg-signal-hold" style={{ width: `${(s.unchanged / total) * 100}%` }} />
                    <div className="bg-signal-strong-sell" style={{ width: `${(s.decliners / total) * 100}%` }} />
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-mono mt-2">
              <span>{((s.advancers / (s.advancers + s.decliners + s.unchanged)) * 100).toFixed(1)}% advancing</span>
              <span>A/D Ratio: {(s.advancers / (s.decliners || 1)).toFixed(2)}</span>
              <span>{((s.decliners / (s.advancers + s.decliners + s.unchanged)) * 100).toFixed(1)}% declining</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Quick links ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-8">
        {[
          { href: "/stocks", icon: BarChart2, label: "All Stocks", desc: "~290 CSE listed" },
          { href: "/portfolio", icon: Activity, label: "My Portfolio", desc: "Track holdings" },
          { href: "/sentiment", icon: Zap, label: "Sentiment Hub", desc: "Social & news" },
          { href: "/stocks?signal=STRONG_BUY", icon: TrendingUp, label: "Strong Buys", desc: "Undervalued picks" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-cse-blue/40 hover:bg-card transition-all group">
              <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-cse-blue-light mb-2 transition-colors" />
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
