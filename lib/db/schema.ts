import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  index,
} from "drizzle-orm/sqlite-core";

// ─── Stocks / Companies ──────────────────────────────────────────────────────
export const stocks = sqliteTable("stocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  isin: text("isin"),
  listedDate: text("listed_date"),
  boardType: text("board_type"), // Main, Diri Savi, SME
  shareCapital: real("share_capital"),
  marketCap: real("market_cap"),
  description: text("description"),
  website: text("website"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── Price Ticks (every 15-second poll) ──────────────────────────────────────
export const priceTicks = sqliteTable(
  "price_ticks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    price: real("price").notNull(),
    change: real("change"),
    changePercent: real("change_percent"),
    volume: integer("volume"),
    trades: integer("trades"),
    high: real("high"),
    low: real("low"),
    open: real("open"),
    prevClose: real("prev_close"),
    bid: real("bid"),
    ask: real("ask"),
    bidVol: integer("bid_vol"),
    askVol: integer("ask_vol"),
    timestamp: text("timestamp").notNull(),
    sessionDate: text("session_date").notNull(),
  },
  (t) => ({
    symbolIdx: index("price_ticks_symbol_idx").on(t.symbol),
    timestampIdx: index("price_ticks_timestamp_idx").on(t.timestamp),
    sessionIdx: index("price_ticks_session_idx").on(t.sessionDate, t.symbol),
  })
);

// ─── Daily OHLCV (end-of-day aggregated) ─────────────────────────────────────
export const dailyPrices = sqliteTable(
  "daily_prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    date: text("date").notNull(),
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close").notNull(),
    volume: integer("volume"),
    trades: integer("trades"),
    turnover: real("turnover"),
    marketCap: real("market_cap"),
  },
  (t) => ({
    symbolDateUniq: index("daily_prices_symbol_date").on(t.symbol, t.date),
  })
);

// ─── Intrinsic Value Calculations ─────────────────────────────────────────────
export const intrinsicValues = sqliteTable(
  "intrinsic_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    calculatedAt: text("calculated_at").notNull(),
    marketPrice: real("market_price"),
    // Individual Models
    dcfValue: real("dcf_value"),
    ddmValue: real("ddm_value"),
    grahamNumber: real("graham_number"),
    grahamFormula: real("graham_formula"),
    peBased: real("pe_based"),
    pbBased: real("pb_based"),
    evEbitdaBased: real("ev_ebitda_based"),
    residualIncome: real("residual_income"),
    fcfEquity: real("fcf_equity"),
    // Monte Carlo
    mcLow: real("mc_low"),
    mcMedian: real("mc_median"),
    mcHigh: real("mc_high"),
    // Weighted Average
    weightedAvg: real("weighted_avg"),
    confidence: real("confidence"), // 0-1
    // Upside/Downside
    upsidePercent: real("upside_percent"),
    signal: text("signal"), // STRONG_BUY | BUY | HOLD | SELL | STRONG_SELL
    // Inputs used
    eps: real("eps"),
    bvps: real("bvps"),
    dps: real("dps"),
    fcfPerShare: real("fcf_per_share"),
    growthRate: real("growth_rate"),
    terminalGrowthRate: real("terminal_growth_rate"),
    discountRate: real("discount_rate"),
    peRatio: real("pe_ratio"),
    pbRatio: real("pb_ratio"),
    roe: real("roe"),
  },
  (t) => ({
    symbolIdx: index("iv_symbol_idx").on(t.symbol),
    calculatedAtIdx: index("iv_calculated_at_idx").on(t.calculatedAt),
  })
);

// ─── Financial Statements ─────────────────────────────────────────────────────
export const financials = sqliteTable(
  "financials",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    period: text("period").notNull(), // "2024-Q3", "2023-FY"
    periodType: text("period_type").notNull(), // Q1 | Q2 | Q3 | Q4 | FY
    revenue: real("revenue"),
    grossProfit: real("gross_profit"),
    ebit: real("ebit"),
    ebitda: real("ebitda"),
    netIncome: real("net_income"),
    eps: real("eps"),
    totalAssets: real("total_assets"),
    totalLiabilities: real("total_liabilities"),
    equity: real("equity"),
    bookValuePerShare: real("book_value_per_share"),
    dividendPerShare: real("dividend_per_share"),
    freeCashFlow: real("free_cash_flow"),
    operatingCashFlow: real("operating_cash_flow"),
    capex: real("capex"),
    debt: real("debt"),
    cash: real("cash"),
    roe: real("roe"),
    roa: real("roa"),
    debtToEquity: real("debt_to_equity"),
    currentRatio: real("current_ratio"),
    reportedAt: text("reported_at"),
    source: text("source"),
  },
  (t) => ({
    symbolPeriodIdx: index("fin_symbol_period_idx").on(t.symbol, t.period),
  })
);

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcements = sqliteTable(
  "announcements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cseId: text("cse_id").unique(),
    symbol: text("symbol"),
    title: text("title").notNull(),
    category: text("category"),
    subcategory: text("subcategory"),
    content: text("content"),
    pdfUrl: text("pdf_url"),
    publishedAt: text("published_at").notNull(),
    isInsiderFlag: integer("is_insider_flag", { mode: "boolean" }).default(
      false
    ),
    insiderScore: real("insider_score"), // 0-1 likelihood of insider info
    sentimentScore: real("sentiment_score"), // -1 to +1
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    symbolIdx: index("ann_symbol_idx").on(t.symbol),
    publishedAtIdx: index("ann_published_at_idx").on(t.publishedAt),
    insiderIdx: index("ann_insider_idx").on(t.isInsiderFlag),
  })
);

// ─── Sentiment Logs (social media) ────────────────────────────────────────────
export const sentimentLogs = sqliteTable(
  "sentiment_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol"),
    source: text("source").notNull(), // twitter | reddit | news | facebook | linkedin
    platform: text("platform"),
    contentId: text("content_id"),
    content: text("content"),
    author: text("author"),
    url: text("url"),
    sentiment: text("sentiment"), // positive | negative | neutral
    sentimentScore: real("sentiment_score"), // -1 to +1
    reach: integer("reach"), // likes + shares
    publishedAt: text("published_at").notNull(),
    fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    symbolIdx: index("sl_symbol_idx").on(t.symbol),
    sourceIdx: index("sl_source_idx").on(t.source),
    publishedAtIdx: index("sl_published_at_idx").on(t.publishedAt),
  })
);

// ─── Market Index Data ────────────────────────────────────────────────────────
export const marketIndex = sqliteTable(
  "market_index",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    indexName: text("index_name").notNull(), // ASPI | S&P SL20
    value: real("value").notNull(),
    change: real("change"),
    changePercent: real("change_percent"),
    turnover: real("turnover"),
    volume: integer("volume"),
    trades: integer("trades"),
    timestamp: text("timestamp").notNull(),
  },
  (t) => ({
    indexNameIdx: index("mi_index_name_idx").on(t.indexName),
    timestampIdx: index("mi_timestamp_idx").on(t.timestamp),
  })
);

// ─── User Portfolio Holdings ──────────────────────────────────────────────────
export const portfolioHoldings = sqliteTable(
  "portfolio_holdings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    quantity: real("quantity").notNull(),
    avgCostPrice: real("avg_cost_price").notNull(),
    purchaseDate: text("purchase_date"),
    notes: text("notes"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    userIdx: index("ph_user_idx").on(t.userId),
    symbolIdx: index("ph_symbol_idx").on(t.symbol),
  })
);

// ─── Watchlist ────────────────────────────────────────────────────────────────
export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    alertPrice: real("alert_price"),
    alertDirection: text("alert_direction"), // above | below
    alertTriggered: integer("alert_triggered", { mode: "boolean" }).default(
      false
    ),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    userIdx: index("wl_user_idx").on(t.userId),
  })
);

// ─── Market Status ────────────────────────────────────────────────────────────
export const marketStatus = sqliteTable("market_status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isOpen: integer("is_open", { mode: "boolean" }).notNull(),
  session: text("session"), // pre | regular | post | closed
  nextOpen: text("next_open"),
  checkedAt: text("checked_at").default(sql`CURRENT_TIMESTAMP`),
});

// ─── NextAuth Tables ──────────────────────────────────────────────────────────
export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role").default("user"), // user | admin
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable("account", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});
