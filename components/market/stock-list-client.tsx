"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Minus, Filter, SortAsc } from "lucide-react";
import { cn, formatPrice, formatPercent, formatVolume } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  sector?: string;
}

type SortKey = "symbol" | "price" | "change" | "volume";
type SortDir = "asc" | "desc";

const SECTORS = ["All", "Banking", "Finance", "Hotels", "Manufacturing", "Plantation", "Diversified", "Healthcare", "IT", "Insurance", "Power"];

export function StockListClient() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await fetch("/api/market/summary");
        const data = await res.json();
        const allMovers: StockRow[] = [
          ...(data.gainers ?? []),
          ...(data.losers ?? []),
          ...(data.mostActive ?? []),
        ].map((s: any) => ({
          symbol: s.symbol,
          name: s.name ?? s.symbol,
          price: s.price,
          change: s.change,
          changePercent: s.percentageChange,
          volume: s.volume,
          sector: s.sector,
        }));

        // Deduplicate
        const seen = new Set<string>();
        const unique = allMovers.filter((s) => {
          if (seen.has(s.symbol)) return false;
          seen.add(s.symbol);
          return true;
        });
        setStocks(unique);
      } catch {
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
    const id = setInterval(fetchStocks, 30000);
    return () => clearInterval(id);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = stocks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    if (sector !== "All") {
      list = list.filter((s) => s.sector?.includes(sector));
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return list;
  }, [stocks, search, sector, sortKey, sortDir]);

  const SortHeader = ({ label, sortK }: { label: string; sortK: SortKey }) => (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-mono uppercase tracking-wider hover:text-foreground transition-colors",
        sortKey === sortK ? "text-foreground" : "text-muted-foreground"
      )}
      onClick={() => handleSort(sortK)}
    >
      {label}
      {sortKey === sortK && (
        <span className="text-cse-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">All Stocks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {stocks.length} stocks · Updated every 30s during market hours
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-muted/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search symbol or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                sector === s
                  ? "bg-cse-blue text-white"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3">
                  <SortHeader label="Symbol" sortK="symbol" />
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Company</span>
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Price" sortK="price" />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Change" sortK="change" />
                </th>
                <th className="text-right px-4 py-3 hidden md:table-cell">
                  <SortHeader label="Volume" sortK="volume" />
                </th>
                <th className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Sector</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(15).fill(0).map((_, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3"><div className="h-4 w-20 skeleton rounded" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-40 skeleton rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 skeleton rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 skeleton rounded ml-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-16 skeleton rounded ml-auto" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 skeleton rounded" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    No stocks found matching "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((stock) => {
                  const isUp = stock.change >= 0;
                  const isDown = stock.change < 0;
                  const shortSym = stock.symbol.replace(".N0000", "").replace(".X0000", "");
                  return (
                    <tr key={stock.symbol} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/stock/${stock.symbol}`} className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {shortSym}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Link href={`/stock/${stock.symbol}`}>
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                            {stock.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold text-sm tabular">
                          {formatPrice(stock.price)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-0.5 font-mono text-sm",
                          isUp ? "text-signal-strong-buy" : isDown ? "text-signal-strong-sell" : "text-muted-foreground"
                        )}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {formatPercent(stock.changePercent)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-mono text-sm text-muted-foreground">
                          {stock.volume ? formatVolume(stock.volume) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {stock.sector && (
                          <Badge variant="secondary" className="text-[10px]">{stock.sector}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground font-mono text-center pb-4">
        Showing {filtered.length} of {stocks.length} stocks · Data from CSE API
      </p>
    </main>
  );
}
