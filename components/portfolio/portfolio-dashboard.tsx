"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Plus, Trash2, PieChart,
  DollarSign, BarChart2, RefreshCw, X,
} from "lucide-react";
import { cn, formatPrice, formatPercent, formatLKR, getChangeColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DEMO_USER_ID = "demo-user-001"; // In prod, from NextAuth session

interface Holding {
  id: number;
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  currentPrice: number;
  marketValue: number;
  costValue: number;
  gainLoss: number;
  gainLossPercent: number;
  change: number;
  changePercent: number;
}

interface PortfolioSummary {
  totalMarketValue: number;
  totalCostValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

const COLORS = ["#003087", "#0047CC", "#C8922A", "#F0B429", "#00C853", "#69F0AE", "#FF6D00", "#D50000"];

export function PortfolioDashboard() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ symbol: "", quantity: "", avgCostPrice: "" });
  const [adding, setAdding] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`/api/portfolio?userId=${DEMO_USER_ID}`);
      const data = await res.json();
      setHoldings(data.holdings ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const id = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(id);
  }, []);

  const handleAdd = async () => {
    if (!addForm.symbol || !addForm.quantity || !addForm.avgCostPrice) return;
    setAdding(true);
    try {
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          symbol: addForm.symbol.toUpperCase(),
          quantity: parseFloat(addForm.quantity),
          avgCostPrice: parseFloat(addForm.avgCostPrice),
        }),
      });
      setAddForm({ symbol: "", quantity: "", avgCostPrice: "" });
      setShowAdd(false);
      fetchPortfolio();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/portfolio?id=${id}&userId=${DEMO_USER_ID}`, { method: "DELETE" });
    fetchPortfolio();
  };

  const pieData = holdings.map((h) => ({
    name: h.symbol.replace(".N0000", ""),
    value: h.marketValue,
  }));

  const isPositive = (summary?.totalGainLoss ?? 0) >= 0;

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your CSE holdings and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchPortfolio}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Holding
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Market Value", value: formatLKR(summary.totalMarketValue), icon: DollarSign, highlight: true },
            { label: "Total Cost", value: formatLKR(summary.totalCostValue), icon: BarChart2 },
            {
              label: "Total P&L",
              value: `${isPositive ? "+" : ""}${formatLKR(summary.totalGainLoss)}`,
              icon: isPositive ? TrendingUp : TrendingDown,
              color: isPositive ? "text-signal-strong-buy" : "text-signal-strong-sell",
            },
            {
              label: "P&L %",
              value: formatPercent(summary.totalGainLossPercent),
              icon: PieChart,
              color: isPositive ? "text-signal-strong-buy" : "text-signal-strong-sell",
            },
          ].map((card) => (
            <div key={card.label} className={cn(
              "rounded-xl border p-4",
              card.highlight ? "border-cse-gold/30 bg-cse-gold/5" : "border-border/60 bg-card/60"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-mono uppercase">{card.label}</span>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={cn("font-display text-xl font-bold tabular", card.color)}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings table */}
        <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-display font-semibold">Holdings</h3>
            <span className="text-xs text-muted-foreground font-mono">{holdings.length} positions</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
            </div>
          ) : holdings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <PieChart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No holdings yet</p>
              <Button onClick={() => setShowAdd(true)} variant="outline" size="sm" className="mt-3 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add your first holding
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    {["Symbol", "Qty", "Avg Cost", "Curr Price", "Mkt Value", "P&L", "P&L %", ""].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/stock/${h.symbol}`} className="font-display font-bold text-sm hover:text-primary">
                          {h.symbol.replace(".N0000", "")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{h.quantity}</td>
                      <td className="px-4 py-3 font-mono text-sm">{formatPrice(h.avgCostPrice)}</td>
                      <td className="px-4 py-3 font-mono text-sm">{formatPrice(h.currentPrice)}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold">{formatLKR(h.marketValue)}</td>
                      <td className={cn("px-4 py-3 font-mono text-sm", h.gainLoss >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell")}>
                        {h.gainLoss >= 0 ? "+" : ""}{formatLKR(h.gainLoss)}
                      </td>
                      <td className={cn("px-4 py-3 font-mono text-sm font-semibold", h.gainLossPercent >= 0 ? "text-signal-strong-buy" : "text-signal-strong-sell")}>
                        {formatPercent(h.gainLossPercent)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie chart */}
        {holdings.length > 0 && (
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="font-display font-semibold mb-4">Allocation</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={80}
                    dataKey="value" nameKey="name"
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatLKR(v)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </RePie>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Add holding modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Add Holding</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Symbol (e.g. COMB.N0000)", key: "symbol", placeholder: "COMB.N0000" },
                { label: "Quantity", key: "quantity", placeholder: "1000", type: "number" },
                { label: "Average Cost Price (LKR)", key: "avgCostPrice", placeholder: "148.50", type: "number" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
                  <input
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={(addForm as any)[field.key]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAdd} disabled={adding}>
                  {adding ? "Adding…" : "Add Holding"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
