import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { WatchlistClient } from "@/components/market/watchlist-client";

export const metadata = { title: "Watchlist — CSE-Intrinsic.ai" };

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <WatchlistClient />
    </div>
  );
}
