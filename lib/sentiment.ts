/**
 * CSE-Intrinsic.ai — Social Sentiment Monitor
 * Aggregates sentiment from multiple sources:
 * - Twitter/X API v2
 * - NewsData.io
 * - RSS feeds (DailyFT, EconomyNext, LBO)
 * - Reddit
 * - HuggingFace for NLP
 */

import { db } from "@/lib/db";
import { sentimentLogs } from "@/lib/db/schema";
import { analyzeSentimentHeuristic } from "@/lib/valuation-models";

export interface SentimentItem {
  source: string;
  platform: string;
  contentId?: string;
  content: string;
  author?: string;
  url?: string;
  publishedAt: string;
  symbol?: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  reach?: number;
}

// ─── HuggingFace Sentiment Analysis ──────────────────────────────────────────
async function huggingFaceSentiment(
  text: string
): Promise<{ score: number; label: string } | null> {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) return null;

  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/ProsusAI/finbert",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
      }
    );

    const data = await res.json() as Array<Array<{label: string; score: number}>>;
    if (!Array.isArray(data) || !data[0]) return null;

    const sorted = data[0].sort((a, b) => b.score - a.score);
    const top = sorted[0];

    const score =
      top.label === "positive"
        ? top.score
        : top.label === "negative"
        ? -top.score
        : 0;

    return { score, label: top.label };
  } catch {
    return null;
  }
}

async function getSentiment(
  text: string
): Promise<{ score: number; label: string }> {
  const hf = await huggingFaceSentiment(text);
  if (hf) return hf;
  const local = analyzeSentimentHeuristic(text);
  return { score: local.score, label: local.label };
}

// ─── Twitter/X API v2 ─────────────────────────────────────────────────────────
export async function fetchTwitterSentiment(
  query: string,
  symbol: string
): Promise<SentimentItem[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return [];

  try {
    const encoded = encodeURIComponent(`(${query}) lang:en -is:retweet`);
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encoded}&max_results=20&tweet.fields=created_at,author_id,public_metrics,text`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return [];
    const data = await res.json() as {
      data?: Array<{
        id: string; text: string; created_at: string;
        public_metrics?: { like_count: number; retweet_count: number };
      }>;
    };

    const items: SentimentItem[] = [];
    for (const tweet of data?.data ?? []) {
      const sentiment = await getSentiment(tweet.text);
      items.push({
        source: "social",
        platform: "twitter",
        contentId: tweet.id,
        content: tweet.text,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        publishedAt: tweet.created_at,
        symbol,
        sentiment: sentiment.label as SentimentItem["sentiment"],
        sentimentScore: sentiment.score,
        reach:
          (tweet.public_metrics?.like_count ?? 0) +
          (tweet.public_metrics?.retweet_count ?? 0),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ─── NewsData.io ───────────────────────────────────────────────────────────────
export async function fetchNewsSentiment(
  query: string,
  symbol: string
): Promise<SentimentItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encoded}&country=lk&language=en`,
    );

    if (!res.ok) return [];
    const data = await res.json() as {
      results?: Array<{
        article_id: string; title: string; description?: string;
        link: string; pubDate: string; source_id: string;
      }>;
    };

    const items: SentimentItem[] = [];
    for (const article of data?.results?.slice(0, 10) ?? []) {
      const text = `${article.title} ${article.description ?? ""}`;
      const sentiment = await getSentiment(text);
      items.push({
        source: "news",
        platform: article.source_id,
        contentId: article.article_id,
        content: text,
        url: article.link,
        publishedAt: article.pubDate,
        symbol,
        sentiment: sentiment.label as SentimentItem["sentiment"],
        sentimentScore: sentiment.score,
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ─── RSS Feed Scraper (DailyFT, EconomyNext, LBO) ────────────────────────────
export async function fetchRSSFeedSentiment(
  symbol: string,
  companyName: string
): Promise<SentimentItem[]> {
  const feeds = [
    { url: "https://www.ft.lk/rss", source: "DailyFT" },
    { url: "https://economynext.com/feed", source: "EconomyNext" },
    { url: "https://lbo.lk/feed", source: "LBO" },
  ];

  const items: SentimentItem[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { Accept: "application/rss+xml" },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      // Simple XML parsing for RSS
      const titleMatches = [...xml.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)];
      const linkMatches = [...xml.matchAll(/<link>(.+?)<\/link>/g)];
      const dateMatches = [...xml.matchAll(/<pubDate>(.+?)<\/pubDate>/g)];

      for (let i = 0; i < titleMatches.length; i++) {
        const title = titleMatches[i][1] ?? "";
        if (
          !title.toLowerCase().includes(symbol.toLowerCase()) &&
          !title.toLowerCase().includes(companyName.toLowerCase())
        ) continue;

        const sentiment = await getSentiment(title);
        items.push({
          source: "news",
          platform: feed.source,
          content: title,
          url: linkMatches[i + 1]?.[1],
          publishedAt: dateMatches[i]?.[1] ?? new Date().toISOString(),
          symbol,
          sentiment: sentiment.label as SentimentItem["sentiment"],
          sentimentScore: sentiment.score,
        });
      }
    } catch {
      // Skip failed feeds
    }
  }

  return items;
}

// ─── Aggregate All Sentiment Sources ─────────────────────────────────────────
export async function aggregateSentiment(
  symbol: string,
  companyName: string
): Promise<{
  items: SentimentItem[];
  summary: {
    avgScore: number;
    positive: number;
    negative: number;
    neutral: number;
    totalItems: number;
    trend: "bullish" | "bearish" | "neutral";
  };
}> {
  const query = `${symbol} CSE OR "${companyName}" stock`;

  const [twitterItems, newsItems, rssItems] = await Promise.allSettled([
    fetchTwitterSentiment(query, symbol),
    fetchNewsSentiment(companyName, symbol),
    fetchRSSFeedSentiment(symbol, companyName),
  ]);

  const items: SentimentItem[] = [
    ...(twitterItems.status === "fulfilled" ? twitterItems.value : []),
    ...(newsItems.status === "fulfilled" ? newsItems.value : []),
    ...(rssItems.status === "fulfilled" ? rssItems.value : []),
  ];

  // Persist to DB
  for (const item of items) {
    try {
      await db.insert(sentimentLogs).values({
        symbol: item.symbol,
        source: item.source,
        platform: item.platform,
        contentId: item.contentId,
        content: item.content?.slice(0, 500),
        author: item.author,
        url: item.url,
        sentiment: item.sentiment,
        sentimentScore: item.sentimentScore,
        reach: item.reach,
        publishedAt: item.publishedAt,
      });
    } catch {
      // Skip duplicates
    }
  }

  // Compute summary
  const positive = items.filter((i) => i.sentiment === "positive").length;
  const negative = items.filter((i) => i.sentiment === "negative").length;
  const neutral = items.filter((i) => i.sentiment === "neutral").length;
  const avgScore =
    items.length > 0
      ? items.reduce((s, i) => s + i.sentimentScore, 0) / items.length
      : 0;

  const trend =
    avgScore > 0.1 ? "bullish" : avgScore < -0.1 ? "bearish" : "neutral";

  return {
    items,
    summary: {
      avgScore,
      positive,
      negative,
      neutral,
      totalItems: items.length,
      trend,
    },
  };
}

// ─── Spike Detection ───────────────────────────────────────────────────────────
export async function detectSentimentSpike(
  symbol: string,
  currentVolume: number,
  avgVolume: number
): Promise<boolean> {
  const volumeRatio = currentVolume / (avgVolume || 1);
  return volumeRatio >= 3; // 300% spike threshold
}
