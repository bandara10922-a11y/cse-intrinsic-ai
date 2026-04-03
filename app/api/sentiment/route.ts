import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sentimentLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { aggregateSentiment } from "@/lib/sentiment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const companyName = searchParams.get("name") ?? symbol ?? "";
  const refresh = searchParams.get("refresh") === "true";
  const limit = 50;

  try {
    if (refresh && symbol) {
      // Fetch fresh data from APIs
      const result = await aggregateSentiment(symbol, companyName);
      return NextResponse.json({
        items: result.items.slice(0, limit),
        summary: result.summary,
        source: "live",
      });
    }

    // Return cached DB data
    let query = db
      .select()
      .from(sentimentLogs)
      .orderBy(desc(sentimentLogs.publishedAt))
      .limit(limit);

    const rows = await query;
    const filtered = symbol
      ? rows.filter((r) => r.symbol?.toUpperCase() === symbol?.toUpperCase())
      : rows;

    const positive = filtered.filter((r) => r.sentiment === "positive").length;
    const negative = filtered.filter((r) => r.sentiment === "negative").length;
    const neutral = filtered.filter((r) => r.sentiment === "neutral").length;
    const avgScore =
      filtered.length > 0
        ? filtered.reduce((s, r) => s + (r.sentimentScore ?? 0), 0) /
          filtered.length
        : 0;

    return NextResponse.json({
      items: filtered,
      summary: {
        avgScore,
        positive,
        negative,
        neutral,
        totalItems: filtered.length,
        trend: avgScore > 0.1 ? "bullish" : avgScore < -0.1 ? "bearish" : "neutral",
      },
      source: "cache",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sentiment data" },
      { status: 500 }
    );
  }
}
