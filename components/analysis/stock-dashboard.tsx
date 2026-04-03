"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, RefreshCw, Star, Bell,
  BarChart2, FileText, Brain, Activity, ArrowLeft,
  Building2, Globe, Phone, ExternalLink, Briefcase,
} from "lucide-react";
import {
  cn, formatPrice, formatPercent, formatLKR, formatVolume,
  getSignalClass, getChangeColor,
} from "@/lib/utils";
import { PriceChart } from "@/components/analysis/price-chart";
import { ValuationDisplay } from "@/components/analysis/valuation-display";
import { TechnicalsDisplay } from "@/components/analysis/technicals-display";
import { SentimentFeed } from "@/components/sentiment/sentiment-feed";
import { AnnouncementsPanel } from "@/components/market/announcements-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StockDashboardProps {
  symbol: string;
}

export function StockDashboard({ symbol }: StockDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stock/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();

      setData((prev: any) => {
        if (prev?.price?.closingPrice && json.price?.closingPrice) {
          const diff = json.price.closingPrice - prev.price.closingPrice;
          if (diff !== 0) {
            setPriceFlash(diff > 0 ? "up" : "down");
            setTimeout(() => setPriceFlash(null), 700);
          }
          setPrevPrice(prev.price.closingPrice);
        }
        return json;
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading) return <StockDashboardSkeleton symbol={symbol} />;
  if (error || !data) return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">{error ?? "Stock not found"}</p>
      <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
    </div>
  );

  const { price, info, chartData, financials: fin, valuation, technicals, tradeSummary } = data;

  const shortSymbol = symbol.replace(".N0000", "").replace(".X0000", "").replace(".D0000", "");
  const isUp = (price?.change ?? 0) >= 0;
  const signalVariant = valuation?.signal
    ? (valuation.signal.toLowerCase().replace("_", "-") as any)
    : "outline";

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <span>/</span>
        <Link href="/stocks" className="hover:text-foreground transition-colors">All Stocks</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{shortSymbol}</span>
      </div>

      {/* ── Stock Header ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Symbol badge */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cse-blue to-cse-blue-light shadow-lg">
              <span className="font-display font-bold text-white text-sm">{shortSymbol.slice(0, 3)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold text-foreground">{info?.name ?? symbol}</h1>
                {info?.boardType && (
                  <Badge variant="secondary" className="text-xs">{info.boardType}</Badge>
                )}
                {info?.sector && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">{info.sector}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{symbol}</p>
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className={cn(
              "font-display text-3xl font-bold tabular transition-colors",
              priceFlash === "up" ? "text-signal-strong-buy" :
              priceFlash === "down" ? "text-signal-strong-sell" :
              "text-foreground"
            )}>
              LKR {formatPrice(price?.closingPrice ?? 0)}
            </div>
            <div className={cn(
              "flex items-center justify-end gap-1 text-base font-mono",
              isUp ? "text-signal-strong-buy" : "text-signal-strong-sell"
            )}>
              {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPercent(price?.percentageChange ?? 0)}
              <span className="text-sm">
                ({price?.change >= 0 ? "+" : ""}{formatPrice(price?.change ?? 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-4 border-t border-border/50">
          {[
            { label: "Open", value: formatPrice(price?.bid ?? 0) },
            { label: "High", value: price?.high ? formatPrice(price.high) : "—" },
            { label: "Low", value: price?.low ? formatPrice(price.low) : "—" },
            { label: "Prev Close", value: price?.previousClosingPrice ? formatPrice(price.previousClosingPrice) : "—" },
            { label: "Volume", value: formatVolume(price?.tradedQuantity ?? 0) },
            { label: "Trades", value: (price?.numberOfTrades ?? 0).toLocaleString() },
            { label: "Market Cap", value: price?.marketCap ? formatLKR(price.marketCap) : "—" },
            { label: "Turnover", value: price?.turnover ? formatLKR(price.turnover) : "—" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{m.label}</div>
              <div className="font-mono font-semibold text-sm tabular mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Signal + Actions */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {valuation && (
              <>
                <Badge className={cn("text-sm px-3 py-1.5", getSignalClass(valuation.signal))}>
                  {valuation.signal.replace("_", " ")}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  IV: <span className="text-cse-gold font-semibold">LKR {formatPrice(valuation.weightedAverage)}</span>
                  <span className={cn("ml-1.5", valuation.upsidePercent >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell")}>
                    ({formatPercent(valuation.upsidePercent)})
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Alert
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Star className="h-3.5 w-3.5" /> Watchlist
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Add to Portfolio
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/50 p-1">
          {[
            { value: "overview", icon: BarChart2, label: "Chart & Overview" },
            { value: "valuation", icon: Brain, label: "Valuation" },
            { value: "technicals", icon: Activity, label: "Technicals" },
            { value: "sentiment", icon: TrendingUp, label: "Sentiment" },
            { value: "announcements", icon: FileText, label: "Announcements" },
            { value: "company", icon: Building2, label: "Company" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-xs sm:text-sm h-8"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview: Chart + financials */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card/60 p-4">
              <h3 className="font-display font-semibold mb-4">Price History</h3>
              {chartData?.length > 0 ? (
                <PriceChart
                  data={chartData}
                  symbol={symbol}
                  bollingerUpper={technicals?.bollingerUpper}
                  bollingerLower={technicals?.bollingerLower}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No chart data available
                </div>
              )}
            </div>

            {/* Key ratios */}
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
              <h3 className="font-display font-semibold">Key Ratios</h3>
              <div className="space-y-1">
                {[
                  { label: "P/E Ratio", value: price?.peRatio ? price.peRatio.toFixed(2) + "x" : "—" },
                  { label: "P/B Ratio", value: price?.pbRatio ? price.pbRatio.toFixed(2) + "x" : "—" },
                  { label: "EPS", value: price?.eps ? "LKR " + formatPrice(price.eps) : "—" },
                  { label: "Dividend Yield", value: price?.dividendYield ? formatPercent(price.dividendYield) : "—" },
                  { label: "Bid", value: price?.bid ? "LKR " + formatPrice(price.bid) : "—" },
                  { label: "Ask", value: price?.ask ? "LKR " + formatPrice(price.ask) : "—" },
                  { label: "Bid Volume", value: price?.bidVolume ? price.bidVolume.toLocaleString() : "—" },
                  { label: "Ask Volume", value: price?.askVolume ? price.askVolume.toLocaleString() : "—" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between py-1.5 border-b border-border/30 last:border-0 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono font-medium">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Broker trades */}
              {tradeSummary?.buyerBrokers?.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-2">Top Buyers</h4>
                  {tradeSummary.buyerBrokers.slice(0, 3).map((b: any) => (
                    <div key={b.broker} className="flex justify-between text-xs py-1">
                      <span className="text-muted-foreground font-mono">{b.broker}</span>
                      <span className="text-signal-strong-buy font-mono">
                        {b.quantity?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          {fin && (
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="font-display font-semibold mb-4">Latest Financials — {fin.period}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { label: "Revenue", value: fin.revenue ? formatLKR(fin.revenue) : "—" },
                  { label: "Net Income", value: fin.netIncome ? formatLKR(fin.netIncome) : "—" },
                  { label: "EBITDA", value: fin.ebitda ? formatLKR(fin.ebitda) : "—" },
                  { label: "EPS", value: fin.eps ? "LKR " + formatPrice(fin.eps) : "—" },
                  { label: "Book Value/Share", value: fin.bookValuePerShare ? "LKR " + formatPrice(fin.bookValuePerShare) : "—" },
                  { label: "ROE", value: fin.roe ? formatPercent(fin.roe * 100) : "—" },
                  { label: "ROA", value: fin.roa ? formatPercent(fin.roa * 100) : "—" },
                  { label: "D/E Ratio", value: fin.debtToEquity ? fin.debtToEquity.toFixed(2) + "x" : "—" },
                  { label: "Free Cash Flow", value: fin.freeCashFlow ? formatLKR(fin.freeCashFlow) : "—" },
                  { label: "Total Debt", value: fin.debt ? formatLKR(fin.debt) : "—" },
                  { label: "Cash", value: fin.cash ? formatLKR(fin.cash) : "—" },
                  { label: "DPS", value: fin.dividendPerShare ? "LKR " + formatPrice(fin.dividendPerShare) : "—" },
                ].map((f) => (
                  <div key={f.label} className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{f.label}</div>
                    <div className="font-mono font-semibold text-sm mt-1 tabular">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Valuation tab */}
        <TabsContent value="valuation">
          {valuation ? (
            <div className="max-w-3xl">
              <ValuationDisplay valuation={valuation} marketPrice={price?.closingPrice ?? 0} />
            </div>
          ) : (
            <NoDataCard
              title="Valuation Unavailable"
              desc="Insufficient financial data to compute intrinsic value. Financial statements needed."
            />
          )}
        </TabsContent>

        {/* Technicals tab */}
        <TabsContent value="technicals">
          {technicals ? (
            <div className="max-w-3xl">
              <TechnicalsDisplay technicals={technicals} currentPrice={price?.closingPrice ?? 0} />
            </div>
          ) : (
            <NoDataCard
              title="Insufficient Price History"
              desc="Need at least 20 trading sessions of data for technical analysis."
            />
          )}
        </TabsContent>

        {/* Sentiment tab */}
        <TabsContent value="sentiment">
          <div className="max-w-2xl">
            <SentimentFeed symbol={symbol} />
          </div>
        </TabsContent>

        {/* Announcements tab */}
        <TabsContent value="announcements">
          <div className="max-w-2xl">
            <AnnouncementsPanel symbol={symbol} />
          </div>
        </TabsContent>

        {/* Company tab */}
        <TabsContent value="company">
          {info ? (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
                <h3 className="font-display font-semibold text-lg">{info.name}</h3>
                {info.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { label: "Sector", value: info.sector, icon: BarChart2 },
                    { label: "Industry", value: info.industry, icon: Building2 },
                    { label: "Board", value: info.boardType, icon: Activity },
                    { label: "Listed", value: info.listedDate, icon: FileText },
                    { label: "ISIN", value: info.isin, icon: FileText },
                    { label: "CEO", value: info.ceo, icon: Building2 },
                    { label: "Auditor", value: info.auditor, icon: FileText },
                    { label: "Registrar", value: info.registrar, icon: FileText },
                  ].filter((f) => f.value).map((field) => (
                    <div key={field.label} className="flex items-start gap-2">
                      <field.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{field.label}</p>
                        <p className="text-sm font-medium">{field.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {(info.website || info.email || info.phone) && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
                    {info.website && (
                      <a href={info.website} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {info.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {info.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <NoDataCard title="Company Info Unavailable" desc="Could not load company details." />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function NoDataCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-8 text-center max-w-md">
      <BarChart2 className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function StockDashboardSkeleton({ symbol }: { symbol: string }) {
  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex justify-between">
          <div className="flex gap-4">
            <div className="h-12 w-12 skeleton rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 w-48 skeleton rounded" />
              <div className="h-4 w-32 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-8 w-32 skeleton rounded ml-auto" />
            <div className="h-5 w-24 skeleton rounded ml-auto" />
          </div>
        </div>
      </div>
      <div className="h-64 skeleton rounded-xl" />
    </main>
  );
}
