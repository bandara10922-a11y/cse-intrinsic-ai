/**
 * CSE-Intrinsic.ai — Market Data Polling Engine
 * Runs as a persistent background service during market hours
 * In production: triggered by Vercel Cron Jobs (vercel.json)
 */

import { db } from "@/lib/db";
import {
  priceTicks,
  dailyPrices,
  marketIndex,
  marketStatus,
  announcements,
  stocks,
} from "@/lib/db/schema";
import {
  fetchMarketSummary,
  fetchAllStocks,
  fetchTopGainers,
  fetchTopLosers,
  fetchMostActive,
  fetchTodaySharePrice,
  fetchAnnouncements,
  fetchASPIData,
  cseQueue,
  type CSETodaySharePrice,
} from "@/lib/cse-api";
import { detectInsiderActivity } from "@/lib/valuation-models";
import { eq, desc } from "drizzle-orm";

// ─── Market Hours (CSE: Mon-Fri 9:30 AM – 2:30 PM Sri Lanka Standard Time, UTC+5:30) ──
function isMarketHours(): boolean {
  const now = new Date();
  // Convert to Sri Lanka time (UTC+5:30)
  const slt = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = slt.getUTCDay(); // 0=Sun, 6=Sat
  const hour = slt.getUTCHours();
  const minute = slt.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 14 * 60 + 30; // 2:30 PM

  return day >= 1 && day <= 5 && timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
}

// ─── Main Poll Function (called every 15s during market hours) ────────────────
export async function pollMarketData(): Promise<{ success: boolean; message: string }> {
  const open = isMarketHours();
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  // Update market status
  await db
    .insert(marketStatus)
    .values({ isOpen: open, session: open ? "regular" : "closed", checkedAt: now })
    .onConflictDoNothing();

  if (!open) {
    return { success: true, message: "Market closed — skipping poll" };
  }

  try {
    // 1. Fetch market summary
    const summary = await fetchMarketSummary();

    // 2. Store index data
    await db.insert(marketIndex).values([
      {
        indexName: "ASPI",
        value: summary.aspiIndex,
        change: summary.aspiChange,
        changePercent: summary.aspiChangePercentage,
        turnover: summary.totalTurnover,
        volume: summary.totalVolume,
        trades: summary.totalTrades,
        timestamp: now,
      },
      {
        indexName: "S&P SL20",
        value: summary.snpIndex,
        change: summary.snpChange,
        changePercent: summary.snpChangePercentage,
        timestamp: now,
      },
    ]);

    // 3. Fetch top movers (covers most active stocks)
    const [gainers, losers, mostActive] = await Promise.all([
      fetchTopGainers(),
      fetchTopLosers(),
      fetchMostActive(),
    ]);

    // Deduplicate symbols from movers
    const symbolSet = new Set<string>();
    [...gainers, ...losers, ...mostActive].forEach((s) => symbolSet.add(s.symbol));

    // 4. Fetch individual prices for all active symbols
    const ticks: typeof priceTicks.$inferInsert[] = [];

    for (const symbol of symbolSet) {
      try {
        const price = await cseQueue.add(() => fetchTodaySharePrice(symbol));
        if (price) {
          ticks.push({
            symbol: price.symbol,
            price: price.closingPrice,
            change: price.change,
            changePercent: price.percentageChange,
            volume: price.tradedQuantity,
            trades: price.numberOfTrades,
            high: price.high,
            low: price.low,
            bid: price.bid,
            ask: price.ask,
            bidVol: price.bidVolume,
            askVol: price.askVolume,
            timestamp: now,
            sessionDate: today,
          });
        }
      } catch {
        // Silently continue on individual failures
      }
    }

    // Batch insert ticks
    if (ticks.length > 0) {
      await db.insert(priceTicks).values(ticks);
    }

    return {
      success: true,
      message: `Polled ${ticks.length} stocks, ASPI: ${summary.aspiIndex}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Poll failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ─── End-of-Day Aggregation ───────────────────────────────────────────────────
export async function aggregateDailyPrices(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Get all symbols that had ticks today
  const todayTicks = await db
    .select()
    .from(priceTicks)
    .where(eq(priceTicks.sessionDate, today));

  const bySymbol = new Map<string, typeof todayTicks>();
  for (const tick of todayTicks) {
    const arr = bySymbol.get(tick.symbol) ?? [];
    arr.push(tick);
    bySymbol.set(tick.symbol, arr);
  }

  for (const [symbol, ticks] of bySymbol) {
    const open = ticks[0]?.price;
    const close = ticks[ticks.length - 1]?.price;
    const high = Math.max(...ticks.map((t) => t.high ?? t.price));
    const low = Math.min(...ticks.map((t) => t.low ?? t.price));
    const volume = ticks[ticks.length - 1]?.volume ?? 0;
    const trades = ticks[ticks.length - 1]?.trades ?? 0;

    await db
      .insert(dailyPrices)
      .values({ symbol, date: today, open, high, low, close, volume, trades })
      .onConflictDoNothing();
  }
}

// ─── Announcement Crawler ─────────────────────────────────────────────────────
export async function crawlAnnouncements(): Promise<number> {
  const latest = await fetchAnnouncements(undefined, 1, 50);
  let newCount = 0;

  for (const ann of latest) {
    try {
      const existing = await db
        .select()
        .from(announcements)
        .where(eq(announcements.cseId, ann.id))
        .limit(1);

      if (existing.length > 0) continue;

      // Detect insider activity
      const insiderSignal = detectInsiderActivity({
        title: ann.title,
        category: ann.category,
        content: "",
      });

      await db.insert(announcements).values({
        cseId: ann.id,
        symbol: ann.symbol,
        title: ann.title,
        category: ann.category,
        subcategory: ann.subcategory,
        pdfUrl: ann.pdfUrl,
        publishedAt: ann.publishedAt,
        isInsiderFlag: insiderSignal.score >= 0.5,
        insiderScore: insiderSignal.score,
      });

      newCount++;
    } catch {
      // Skip on duplicate
    }
  }

  return newCount;
}

// ─── Seed Stocks Database ─────────────────────────────────────────────────────
export async function seedStocksDatabase(): Promise<void> {
  const allStocks = await fetchAllStocks();

  for (const stock of allStocks) {
    await db
      .insert(stocks)
      .values({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        boardType: stock.boardType,
      })
      .onConflictDoNothing();
  }
}

// ─── Puppeteer Fallback Scraper ────────────────────────────────────────────────
// Disabled by default. puppeteer is not installed in package.json.
// To enable: npm install puppeteer && set ENABLE_PUPPETEER_SCRAPER=true
export async function scrapePriceViaPuppeteer(
  symbol: string
): Promise<Partial<CSETodaySharePrice> | null> {
  if (process.env.ENABLE_PUPPETEER_SCRAPER !== "true") return null;
  console.warn("Puppeteer not installed. Run: npm install puppeteer");
  return null;
}
