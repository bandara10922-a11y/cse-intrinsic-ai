/**
 * CSE (Colombo Stock Exchange) API Client
 * Base: https://www.cse.lk/api/
 * All endpoints are POST with JSON body (unless noted)
 */

const BASE = process.env.CSE_API_BASE ?? "https://www.cse.lk/api";

// ─── Shared fetch helper ──────────────────────────────────────────────────────
async function csePost<T>(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const url = `${BASE}/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; CSE-Intrinsic-Bot/1.0; +https://cse-intrinsic.ai)",
      Referer: "https://www.cse.lk/",
      Origin: "https://www.cse.lk",
    },
    body: JSON.stringify(body),
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) {
    throw new Error(`CSE API ${endpoint} → HTTP ${res.status}`);
  }

  const data = await res.json();
  return data as T;
}

// ─── Type Definitions ─────────────────────────────────────────────────────────
export interface CSEMarketSummary {
  isMarketOpen: boolean;
  aspiIndex: number;
  aspiChange: number;
  aspiChangePercentage: number;
  snpIndex: number;
  snpChange: number;
  snpChangePercentage: number;
  totalTurnover: number;
  totalVolume: number;
  totalTrades: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  date: string;
  time: string;
}

export interface CSETodaySharePrice {
  symbol: string;
  name: string;
  closingPrice: number;
  previousClosingPrice: number;
  change: number;
  percentageChange: number;
  tradedQuantity: number;
  numberOfTrades: number;
  turnover: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  bidVolume: number;
  askVolume: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  eps: number;
  dividendYield: number;
}

export interface CSETopMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentageChange: number;
  volume: number;
  turnover: number;
}

export interface CSEChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CSECompanyInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  isin: string;
  listedDate: string;
  boardType: string;
  shareCapital: number;
  description: string;
  website: string;
  ceo: string;
  auditor: string;
  registrar: string;
  email: string;
  phone: string;
  address: string;
}

export interface CSEAnnouncement {
  id: string;
  symbol: string;
  companyName: string;
  title: string;
  category: string;
  subcategory: string;
  publishedAt: string;
  pdfUrl: string;
}

export interface CSETradeSummary {
  symbol: string;
  date: string;
  openingPrice: number;
  closingPrice: number;
  highPrice: number;
  lowPrice: number;
  totalVolume: number;
  totalTrades: number;
  totalTurnover: number;
  marketCap: number;
  buyerBrokers: Array<{ broker: string; quantity: number; value: number }>;
  sellerBrokers: Array<{ broker: string; quantity: number; value: number }>;
}

export interface AllStockListItem {
  symbol: string;
  name: string;
  sector: string;
  boardType: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchMarketSummary(): Promise<CSEMarketSummary> {
  return csePost<CSEMarketSummary>("marketSummery");
}

export async function fetchASPIData(
  period: string = "1M"
): Promise<CSEChartPoint[]> {
  const raw = await csePost<{ requestData?: CSEChartPoint[] }>("aspiData", {
    period,
  });
  return raw?.requestData ?? [];
}

export async function fetchSNPData(
  period: string = "1M"
): Promise<CSEChartPoint[]> {
  const raw = await csePost<{ requestData?: CSEChartPoint[] }>("snpData", {
    period,
  });
  return raw?.requestData ?? [];
}

export async function fetchTodaySharePrice(
  symbol: string
): Promise<CSETodaySharePrice | null> {
  const raw = await csePost<{ reqData?: CSETodaySharePrice }>(
    "todaySharePrice",
    { symbol }
  );
  return raw?.reqData ?? null;
}

export async function fetchCompanyInfo(
  symbol: string
): Promise<CSECompanyInfo | null> {
  const raw = await csePost<{ reqData?: CSECompanyInfo }>(
    "companyInfoSummery",
    { symbol }
  );
  return raw?.reqData ?? null;
}

export async function fetchTradeSummary(
  symbol: string,
  date?: string
): Promise<CSETradeSummary | null> {
  const raw = await csePost<{ reqData?: CSETradeSummary }>("tradeSummary", {
    symbol,
    date: date ?? new Date().toISOString().split("T")[0],
  });
  return raw?.reqData ?? null;
}

export async function fetchChartData(
  symbol: string,
  period: string = "3M"
): Promise<CSEChartPoint[]> {
  const raw = await csePost<{ reqData?: CSEChartPoint[] }>("chartData", {
    symbol,
    chartId: symbol,
    period,
  });
  return raw?.reqData ?? [];
}

export async function fetchTopGainers(): Promise<CSETopMover[]> {
  const raw = await csePost<{ reqData?: CSETopMover[] }>("topGainers");
  return raw?.reqData ?? [];
}

export async function fetchTopLosers(): Promise<CSETopMover[]> {
  const raw = await csePost<{ reqData?: CSETopMover[] }>("topLooses");
  return raw?.reqData ?? [];
}

export async function fetchMostActive(): Promise<CSETopMover[]> {
  const raw = await csePost<{ reqData?: CSETopMover[] }>("mostActiveTrades");
  return raw?.reqData ?? [];
}

export async function fetchAnnouncements(
  symbol?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<CSEAnnouncement[]> {
  const body: Record<string, unknown> = { page, pageSize };
  if (symbol) body.symbol = symbol;
  const raw = await csePost<{ reqData?: CSEAnnouncement[] }>(
    "approvedAnnouncement",
    body
  );
  return raw?.reqData ?? [];
}

export async function fetchFinancialAnnouncements(
  symbol?: string,
  page: number = 1
): Promise<CSEAnnouncement[]> {
  const body: Record<string, unknown> = { page, pageSize: 20 };
  if (symbol) body.symbol = symbol;
  const raw = await csePost<{ reqData?: CSEAnnouncement[] }>(
    "getFinancialAnnouncement",
    body
  );
  return raw?.reqData ?? [];
}

export async function fetchAllStocks(): Promise<AllStockListItem[]> {
  // CSE provides a full listing endpoint
  const raw = await csePost<{ reqData?: AllStockListItem[] }>(
    "allSharePriceList"
  );
  return raw?.reqData ?? [];
}

export async function fetchMarketStatus(): Promise<boolean> {
  const summary = await fetchMarketSummary();
  return summary.isMarketOpen ?? false;
}

// ─── Batch helper for multiple symbols ───────────────────────────────────────
export async function fetchBatchPrices(
  symbols: string[]
): Promise<Map<string, CSETodaySharePrice>> {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchTodaySharePrice(s))
  );
  const map = new Map<string, CSETodaySharePrice>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      map.set(symbols[i], r.value);
    }
  });
  return map;
}

// ─── Rate-limited queue ───────────────────────────────────────────────────────
class RateLimitedQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private running = 0;
  private maxConcurrent = 3;
  private delayMs = 200;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result as T);
        } catch (e) {
          reject(e);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const fn = this.queue.shift()!;
    await fn();
    await new Promise((r) => setTimeout(r, this.delayMs));
    this.running--;
    this.process();
  }
}

export const cseQueue = new RateLimitedQueue();
