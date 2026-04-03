import { Header } from "@/components/layout/header";
import { MarketTicker } from "@/components/market/market-ticker";
import { SentimentHub } from "@/components/sentiment/sentiment-hub";

export const metadata = {
  title: "Sentiment Hub — CSE-Intrinsic.ai",
};

export default function SentimentPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarketTicker />
      <SentimentHub />
    </div>
  );
}
