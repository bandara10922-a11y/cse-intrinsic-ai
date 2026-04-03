import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";

export const metadata = {
  title: "Portfolio — CSE-Intrinsic.ai",
};

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <PortfolioDashboard />
    </div>
  );
}
