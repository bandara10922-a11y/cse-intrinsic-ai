import React from "react";
import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { StockDashboard } from "@/components/analysis/stock-dashboard";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} — CSE-Intrinsic.ai`,
    description: `Real-time intrinsic value, technicals, and sentiment analysis for ${symbol.toUpperCase()} on the Colombo Stock Exchange.`,
  };
}

export default async function StockPage({ params }: Props) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  // Basic symbol validation
  if (!/^[A-Z0-9.]{2,20}$/.test(upper)) return notFound();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <StockDashboard symbol={upper} />
    </div>
  );
}
