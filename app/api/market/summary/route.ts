import { NextResponse } from "next/server";
import { fetchMarketSummary, fetchTopGainers, fetchTopLosers, fetchMostActive } from "@/lib/cse-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [summary, gainers, losers, active] = await Promise.allSettled([
      fetchMarketSummary(),
      fetchTopGainers(),
      fetchTopLosers(),
      fetchMostActive(),
    ]);

    return NextResponse.json({
      summary: summary.status === "fulfilled" ? summary.value : null,
      gainers: gainers.status === "fulfilled" ? gainers.value : [],
      losers: losers.status === "fulfilled" ? losers.value : [],
      mostActive: active.status === "fulfilled" ? active.value : [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
