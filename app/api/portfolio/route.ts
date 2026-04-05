import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolioHoldings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchTodaySharePrice } from "@/lib/cse-api";

export const dynamic = "force-dynamic";

// GET /api/portfolio?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const holdings = await db
    .select()
    .from(portfolioHoldings)
    .where(eq(portfolioHoldings.userId, userId));

  // Enrich with live prices
  const enriched = await Promise.all(
    holdings.map(async (h) => {
      const livePrice = await fetchTodaySharePrice(h.symbol).catch(() => null);
      const currentPrice = livePrice?.closingPrice ?? h.avgCostPrice;
      const marketValue = currentPrice * h.quantity;
      const costValue = h.avgCostPrice * h.quantity;
      const gainLoss = marketValue - costValue;
      const gainLossPercent = (gainLoss / costValue) * 100;
      return {
        ...h,
        currentPrice,
        marketValue,
        costValue,
        gainLoss,
        gainLossPercent,
        change: livePrice?.change ?? 0,
        changePercent: livePrice?.percentageChange ?? 0,
      };
    })
  );

  const totalMarketValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCostValue = enriched.reduce((s, h) => s + h.costValue, 0);
  const totalGainLoss = totalMarketValue - totalCostValue;

  return NextResponse.json({
    holdings: enriched,
    summary: {
      totalMarketValue,
      totalCostValue,
      totalGainLoss,
      totalGainLossPercent: (totalGainLoss / totalCostValue) * 100,
    },
  });
}

// POST /api/portfolio — add holding
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, symbol, quantity, avgCostPrice, purchaseDate, notes } = body;

  if (!userId || !symbol || !quantity || !avgCostPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const holding = await db
    .insert(portfolioHoldings)
    .values({
      userId,
      symbol: symbol.toUpperCase(),
      quantity,
      avgCostPrice,
      purchaseDate,
      notes,
    })
    .returning();

  return NextResponse.json({ holding: holding[0] });
}

// DELETE /api/portfolio?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");

  if (!id || !userId) {
    return NextResponse.json({ error: "id and userId required" }, { status: 400 });
  }

  await db
    .delete(portfolioHoldings)
    .where(
      and(
        eq(portfolioHoldings.id, parseInt(id)),
        eq(portfolioHoldings.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}
