# CSE-Intrinsic.ai 🇱🇰

**The most powerful Colombo Stock Exchange analysis platform ever built.**

Real-time intrinsic value calculation, AI-powered sentiment monitoring, insider activity detection, and comprehensive technical analysis for all ~290 CSE-listed stocks.

---

## ✨ Features

### 📊 Real-Time Market Data
- Live ASPI & S&P SL20 index tracking
- Polls CSE API every 15 seconds during market hours (9:30 AM – 2:30 PM SLT)
- Scrolling market ticker with price flash animations
- Top Gainers, Losers, Most Active leaderboards

### 💰 10-Model Intrinsic Value Engine
| Model | Description |
|-------|-------------|
| DCF (2-Stage) | Discounted Cash Flow with terminal value |
| DDM (Gordon Growth) | Dividend Discount Model |
| DDM (Multi-Stage) | Three-phase dividend growth |
| Graham Number | √(22.5 × EPS × BVPS) |
| Graham Formula | Revised with SL bond yield |
| P/E Relative | EPS × sector P/E |
| P/B Relative | Justified P/B via ROE |
| EV/EBITDA | Enterprise value approach |
| Residual Income | Edwards-Bell-Ohlson |
| FCF to Equity | Free cash flow discounting |
| **Monte Carlo** | 1,000-run simulation with distribution |

### 📈 Technical Analysis
- SMA 20/50/200, EMA 12/26, MACD, RSI(14)
- Bollinger Bands, Stochastic, ATR, OBV
- Fibonacci Retracement (52-week)
- Trend/Momentum/Signal scoring

### 🧠 AI Sentiment Layer
- Twitter/X API v2 real-time search
- NewsData.io news aggregation
- RSS feeds: DailyFT, EconomyNext, LBO
- HuggingFace FinBERT sentiment scoring
- Heuristic fallback (works without API keys)

### 🔍 Insider Activity Radar
- Automatic keyword pattern matching on CSE announcements
- Volume spike cross-correlation
- Pre-announcement price movement detection
- Insider score 0–100% with severity levels (LOW/MEDIUM/HIGH/CRITICAL)

### 💼 Portfolio & Watchlist
- Add holdings with average cost price
- Live P&L tracking with intrinsic value comparison
- Watchlist with above/below price alerts
- Pie chart allocation view

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/cse-intrinsic-ai.git
cd cse-intrinsic-ai
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — only NEXTAUTH_SECRET is strictly required for dev

# 3. Initialize database
npm run db:migrate
npm run db:seed

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables (minimum for dev)

```env
NEXTAUTH_SECRET=any-random-string-32-chars
TURSO_DATABASE_URL=file:./cse.db
```

All other keys are optional — the app degrades gracefully:
- No HuggingFace key → uses heuristic sentiment
- No Twitter key → skips Twitter feed
- No NewsData key → skips news API (RSS still works)

---

## ☁️ Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Required env vars on Vercel:
```
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=<from Turso dashboard>
```

### Set up Turso (free tier — 500MB):
```bash
npm install -g turso
turso auth login
turso db create cse-intrinsic
turso db show cse-intrinsic  # → copy URL
turso db tokens create cse-intrinsic  # → copy token
```

### Cron Jobs (auto-configured via vercel.json)
The cron job at `/api/cron/poll` fires every minute. Add to Vercel env:
```
CRON_SECRET=<random string to protect endpoint>
```

---

## 🐳 Docker Self-Hosted

```bash
# Build
docker build -t cse-intrinsic .

# Run
docker run -d \
  -p 3000:3000 \
  -v cse-data:/app/data \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=http://localhost:3000 \
  --name cse-intrinsic \
  cse-intrinsic
```

For 24/7 polling without Vercel cron, add a system cron:
```bash
# Add to crontab (crontab -e)
* 3-9 * * 1-5 curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/poll
```
(3:00–9:00 UTC = 8:30 AM–2:30 PM SLT)

---

## 📁 Project Structure

```
cse-intrinsic/
├── app/
│   ├── page.tsx                 # Home dashboard
│   ├── stock/[symbol]/page.tsx  # Stock analysis page
│   ├── stocks/page.tsx          # All stocks listing
│   ├── portfolio/page.tsx       # Portfolio tracker
│   ├── watchlist/page.tsx       # Watchlist
│   ├── sentiment/page.tsx       # Sentiment hub
│   └── api/
│       ├── market/summary/      # Market overview
│       ├── stock/[symbol]/      # Stock data + valuation
│       ├── announcements/       # CSE announcements
│       ├── sentiment/           # Social sentiment
│       ├── portfolio/           # Portfolio CRUD
│       ├── watchlist/           # Watchlist CRUD
│       └── cron/poll/           # Background poller
├── components/
│   ├── layout/                  # Header, nav
│   ├── market/                  # Ticker, stock cards, list
│   ├── analysis/                # Charts, valuation, technicals
│   ├── sentiment/               # Feed, hub
│   ├── portfolio/               # Portfolio UI
│   └── ui/                      # shadcn primitives
├── lib/
│   ├── cse-api.ts               # CSE API client (all endpoints)
│   ├── valuation-models.ts      # All 10 valuation models + technicals
│   ├── market-engine.ts         # Background polling service
│   ├── sentiment.ts             # Social media + NLP sentiment
│   ├── utils.ts                 # Formatting utilities
│   └── db/
│       ├── schema.ts            # Drizzle ORM schema
│       └── index.ts             # DB client
├── scripts/
│   ├── migrate.ts               # Run DB migrations
│   └── seed.ts                  # Seed stock database
├── .env.example                 # All environment variable templates
├── vercel.json                  # Cron jobs + headers
├── Dockerfile                   # Self-hosted deployment
└── drizzle.config.ts            # ORM config
```

---

## 🔑 API Reference

### CSE API Endpoints Used
All POST to `https://www.cse.lk/api/`:

| Endpoint | Description |
|----------|-------------|
| `marketSummery` | ASPI, S&P SL20, turnover, advancers/decliners |
| `todaySharePrice` | Live price, bid/ask, P/E, P/B, EPS for a symbol |
| `companyInfoSummery` | Company details, sector, ISIN |
| `tradeSummary` | Daily OHLCV + broker breakdown |
| `chartData` | Historical OHLCV for charting |
| `topGainers` | Top gaining stocks |
| `topLooses` | Top losing stocks |
| `mostActiveTrades` | Most traded by volume |
| `aspiData` | ASPI historical index data |
| `snpData` | S&P SL20 historical data |
| `approvedAnnouncement` | CSE approved announcements |
| `getFinancialAnnouncement` | Financial disclosures |
| `allSharePriceList` | Full list of all listed stocks |

---

## 📜 License

MIT © CSE-Intrinsic.ai

**Disclaimer**: This platform is for educational and informational purposes only. Not financial advice. Always do your own research before investing.
