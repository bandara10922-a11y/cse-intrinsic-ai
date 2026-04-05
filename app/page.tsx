import React from "react";
import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <HomeDashboard />
    </div>
  );
}
