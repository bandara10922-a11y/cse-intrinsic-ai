"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Plus, Trash2, Bell, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn, formatPrice, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DEMO_USER_ID = "demo-user-001";

interface WatchItem {
  id: number;
  symbol: string;
  alertPrice?: number;
  alertDirection?: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  alertTriggered?: boolean;
}

export function WatchlistClient() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: "", alertPrice: "", alertDirection: "above" });

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`/api/watchlist?userId=${DEMO_USER_ID}`);
      const data = await res.json();
      setItems(data.watchlist ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    const id = setInterval(fetchWatchlist, 30000);
    return () => clearInterval(id);
  }, []);

  const handleAdd = async () => {
    if (!form.symbol) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: DEMO_USER_ID,
        symbol: form.symbol,
        alertPrice: form.alertPrice ? parseFloat(form.alertPrice) : null,
        alertDirection: form.alertDirection,
      }),
    });
    setForm({ symbol: "", alertPrice: "", alertDirection: "above" });
    setShowAdd(false);
    fetchWatchlist();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/watchlist?id=${id}&userId=${DEMO_USER_ID}`, { method: "DELETE" });
    fetchWatchlist();
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-cse-gold" /> Watchlist
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor stocks and get alerted on price triggers</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Stock
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 p-12 text-center">
          <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-muted-foreground">Your watchlist is empty</p>
          <Button onClick={() => setShowAdd(true)} variant="outline" size="sm" className="mt-3 gap-1">
            <Plus className="h-3.5 w-3.5" /> Add your first stock
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Symbol", "Price", "Change", "Alert", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item) => {
                const isUp = (item.changePercent ?? 0) >= 0;
                const short = item.symbol.replace(".N0000", "").replace(".X0000", "");
                return (
                  <tr key={item.id} className={cn(
                    "hover:bg-muted/20 transition-colors group",
                    item.alertTriggered && "bg-cse-gold/5 border-l-2 border-l-cse-gold"
                  )}>
                    <td className="px-4 py-3">
                      <Link href={`/stock/${item.symbol}`} className="font-display font-bold text-sm hover:text-primary">
                        {short}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {item.currentPrice ? `LKR ${formatPrice(item.currentPrice)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.changePercent !== undefined && (
                        <span className={cn(
                          "flex items-center gap-0.5 font-mono text-sm",
                          isUp ? "text-signal-strong-buy" : "text-signal-strong-sell"
                        )}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPercent(item.changePercent)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.alertPrice && (
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-mono",
                          item.alertTriggered ? "text-cse-gold font-bold" : "text-muted-foreground"
                        )}>
                          <Bell className="h-3 w-3" />
                          {item.alertDirection} LKR {formatPrice(item.alertPrice)}
                          {item.alertTriggered && " 🔔 TRIGGERED"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Add to Watchlist</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Symbol</label>
                <input
                  placeholder="e.g. COMB.N0000"
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Price Alert (optional)</label>
                <div className="flex gap-2">
                  <select
                    value={form.alertDirection}
                    onChange={(e) => setForm((f) => ({ ...f, alertDirection: e.target.value }))}
                    className="h-9 px-2 rounded-lg border border-input bg-muted/30 text-sm focus:outline-none"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <input
                    placeholder="Price (LKR)"
                    type="number"
                    value={form.alertPrice}
                    onChange={(e) => setForm((f) => ({ ...f, alertPrice: e.target.value }))}
                    className="flex-1 h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAdd}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
