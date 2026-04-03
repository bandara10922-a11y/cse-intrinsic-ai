import React from "react";
import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { StockListClient } from "@/components/market/stock-list-client";

export const metadata = {
  title: "All Stocks — CSE-Intrinsic.ai",
  description: "Browse all ~290 stocks listed on the Colombo Stock Exchange with real-time prices and signals.",
};

export default function StocksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <StockListClient />
    </div>
  );
}
