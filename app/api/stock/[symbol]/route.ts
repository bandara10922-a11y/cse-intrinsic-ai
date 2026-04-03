import { NextResponse } from "next/server";
import { fetchTodaySharePrice, fetchCompanyInfo, fetchChartData, fetchTradeSummary } from "@/lib/cse-api";
import { db } from "@/lib/db";
import { financials, intrinsicValues } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { computeValuation, computeTechnicals, type FinancialInputs, type OHLCV } from "@/lib/valuation-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const [price, info, chartData, tradeSummary] = await Promise.allSettled([
      fetchTodaySharePrice(upperSymbol),
      fetchCompanyInfo(upperSymbol),
      fetchChartData(upperSymbol, "3M"),
      fetchTradeSummary(upperSymbol),
    ]);

    const priceData = price.status === "fulfilled" ? price.value : null;
    const infoData = info.status === "fulfilled" ? info.value : null;
    const ohlcv = chartData.status === "fulfilled" ? chartData.value : [];
    const trade = tradeSummary.status === "fulfilled" ? tradeSummary.value : null;

    // Get latest financials from DB
    const latestFinancials = await db
      .select()
      .from(financials)
      .where(eq(financials.symbol, upperSymbol))
      .orderBy(desc(financials.reportedAt))
      .limit(1);

    const fin = latestFinancials[0];

    // Compute intrinsic value if we have enough data
    let valuation = null;
    if (priceData) {
      const inputs: FinancialInputs = {
        marketPrice: priceData.closingPrice,
        sharesOutstanding: priceData.marketCap / priceData.closingPrice || 1e6,
        eps: fin?.eps ?? priceData.eps ?? 0,
        bookValuePerShare: fin?.bookValuePerShare ?? 0,
        dividendPerShare: fin?.dividendPerShare ?? 0,
        freeCashFlowPerShare: fin?.freeCashFlow
          ? fin.freeCashFlow / (priceData.marketCap / priceData.closingPrice)
          : undefined,
        roe: fin?.roe ?? undefined,
        ebitda: fin?.ebitda ?? undefined,
        totalDebt: fin?.debt ?? undefined,
        cash: fin?.cash ?? undefined,
        growthRate: 0.08,
        peRatio: priceData.peRatio,
        pbRatio: priceData.pbRatio,
        sectorPE: 15,
        sectorPB: 1.5,
        sectorEVEBITDA: 8,
      };

      try {
        valuation = computeValuation(inputs);
      } catch {
        valuation = null;
      }
    }

    // Compute technicals
    let technicals = null;
    if (ohlcv.length >= 20) {
      const ohlcvTyped: OHLCV[] = ohlcv.map((d) => ({
        date: d.date,
        open: d.open ?? d.close,
        high: d.high ?? d.close,
        low: d.low ?? d.close,
        close: d.close,
        volume: d.volume ?? 0,
      }));
      try {
        technicals = computeTechnicals(ohlcvTyped);
      } catch {
        technicals = null;
      }
    }

    return NextResponse.json({
      symbol: upperSymbol,
      price: priceData,
      info: infoData,
      chartData: ohlcv,
      tradeSummary: trade,
      financials: fin ?? null,
      valuation,
      technicals,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch stock data for ${upperSymbol}` },
      { status: 500 }
    );
  }
}
