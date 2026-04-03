/**
 * CSE-Intrinsic.ai — Valuation Models Engine
 * All valuation models used by professional analysts, adapted for CSE stocks
 */

export interface FinancialInputs {
  // Price & Market Data
  marketPrice: number;
  sharesOutstanding: number;
  marketCap?: number;

  // Income Statement
  eps: number; // Earnings Per Share (LKR)
  revenue?: number;
  ebitda?: number;
  ebit?: number;
  netIncome?: number;

  // Balance Sheet
  bookValuePerShare: number; // BVPS
  totalAssets?: number;
  totalDebt?: number;
  cash?: number;
  equity?: number;

  // Cash Flow
  dividendPerShare?: number; // DPS
  freeCashFlowPerShare?: number; // FCF/share
  operatingCashFlowPerShare?: number;

  // Rates & Ratios
  roe?: number; // Return on Equity (0-1)
  roa?: number;
  growthRate?: number; // Historical/estimated annual growth (0-1)
  terminalGrowthRate?: number; // Long-term growth (typically 0.03-0.05 for SL)
  discountRate?: number; // WACC or required return (0-1)
  peRatio?: number; // Trailing P/E
  pbRatio?: number; // Price/Book

  // Sector Comparables
  sectorPE?: number;
  sectorPB?: number;
  sectorPS?: number;
  sectorEVEBITDA?: number;
}

export interface ValuationResult {
  // Individual Model Values (all in LKR per share)
  dcfValue: number | null;
  ddmGordon: number | null;
  ddmMultiStage: number | null;
  grahamNumber: number | null;
  grahamFormula: number | null;
  peBased: number | null;
  pbBased: number | null;
  psBased: number | null;
  evEbitdaBased: number | null;
  residualIncome: number | null;
  fcfEquity: number | null;
  // Monte Carlo
  mcSimulation: MonteCarloResult | null;
  // Composite
  weightedAverage: number;
  confidence: number; // 0-1
  upsidePercent: number;
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  // Model weights used
  weights: Record<string, number>;
  // Breakdown for UI
  breakdown: ValuationBreakdownItem[];
}

export interface ValuationBreakdownItem {
  model: string;
  value: number | null;
  weight: number;
  contribution: number | null;
  description: string;
  reliability: "high" | "medium" | "low";
}

export interface MonteCarloResult {
  low: number; // 5th percentile
  median: number; // 50th percentile
  high: number; // 95th percentile
  mean: number;
  stdDev: number;
  runs: number;
  distribution: number[]; // sample of 100 values for histogram
}

// ─── Default assumptions for Sri Lankan market ───────────────────────────────
const SL_DEFAULTS = {
  riskFreeRate: 0.092, // 10Y SL Govt bond ~9.2%
  equityRiskPremium: 0.065, // CSE market premium
  terminalGrowthRate: 0.04, // Long-term SL GDP growth proxy
  betaDefault: 1.0,
  defaultGrowthRate: 0.08,
  defaultROE: 0.12,
};

function wacc(
  roe?: number,
  beta: number = SL_DEFAULTS.betaDefault
): number {
  const capm =
    SL_DEFAULTS.riskFreeRate + beta * SL_DEFAULTS.equityRiskPremium;
  return roe ? Math.max(capm, roe * 0.7) : capm;
}

// ─── 1. Discounted Cash Flow (2-Stage) ───────────────────────────────────────
export function dcfTwoStage(
  inputs: FinancialInputs,
  highGrowthYears: number = 5
): number | null {
  const {
    freeCashFlowPerShare,
    eps,
    growthRate,
    terminalGrowthRate,
    discountRate,
  } = inputs;

  const fcf = freeCashFlowPerShare ?? eps * 0.7;
  if (!fcf || fcf <= 0) return null;

  const g1 = growthRate ?? SL_DEFAULTS.defaultGrowthRate;
  const g2 = terminalGrowthRate ?? SL_DEFAULTS.terminalGrowthRate;
  const r = discountRate ?? wacc(inputs.roe);

  if (r <= g2) return null;

  // Stage 1: High growth phase
  let pv = 0;
  let cashFlow = fcf;
  for (let t = 1; t <= highGrowthYears; t++) {
    cashFlow *= 1 + g1;
    pv += cashFlow / Math.pow(1 + r, t);
  }

  // Stage 2: Terminal value (Gordon Growth)
  const terminalValue =
    (cashFlow * (1 + g2)) / (r - g2) / Math.pow(1 + r, highGrowthYears);

  return pv + terminalValue;
}

// ─── 2. Dividend Discount Model (Gordon Growth) ───────────────────────────────
export function ddmGordonGrowth(inputs: FinancialInputs): number | null {
  const { dividendPerShare, growthRate, discountRate } = inputs;
  if (!dividendPerShare || dividendPerShare <= 0) return null;

  const g = growthRate ?? SL_DEFAULTS.defaultGrowthRate;
  const r = discountRate ?? wacc(inputs.roe);

  if (r <= g) return null;
  return (dividendPerShare * (1 + g)) / (r - g);
}

// ─── 3. Multi-Stage DDM ────────────────────────────────────────────────────────
export function ddmMultiStage(inputs: FinancialInputs): number | null {
  const { dividendPerShare, growthRate, terminalGrowthRate, discountRate } =
    inputs;
  if (!dividendPerShare || dividendPerShare <= 0) return null;

  const g1 = growthRate ?? SL_DEFAULTS.defaultGrowthRate;
  const g2 = (g1 + (terminalGrowthRate ?? SL_DEFAULTS.terminalGrowthRate)) / 2;
  const g3 = terminalGrowthRate ?? SL_DEFAULTS.terminalGrowthRate;
  const r = discountRate ?? wacc(inputs.roe);

  if (r <= g3) return null;

  const phases = [
    { years: 5, rate: g1 },
    { years: 5, rate: g2 },
  ];

  let pv = 0;
  let dps = dividendPerShare;
  let t = 0;

  for (const phase of phases) {
    for (let y = 0; y < phase.years; y++) {
      t++;
      dps *= 1 + phase.rate;
      pv += dps / Math.pow(1 + r, t);
    }
  }

  // Terminal value
  const terminalValue =
    (dps * (1 + g3)) / (r - g3) / Math.pow(1 + r, t);
  return pv + terminalValue;
}

// ─── 4. Graham Number ─────────────────────────────────────────────────────────
export function grahamNumber(inputs: FinancialInputs): number | null {
  const { eps, bookValuePerShare } = inputs;
  if (!eps || eps <= 0 || !bookValuePerShare || bookValuePerShare <= 0)
    return null;
  return Math.sqrt(22.5 * eps * bookValuePerShare);
}

// ─── 5. Benjamin Graham Formula (Revised) ────────────────────────────────────
export function grahamRevised(inputs: FinancialInputs): number | null {
  const { eps, growthRate } = inputs;
  if (!eps || eps <= 0) return null;

  const g = (growthRate ?? SL_DEFAULTS.defaultGrowthRate) * 100; // as percentage
  const Y = SL_DEFAULTS.riskFreeRate * 100; // current SL bond yield
  const V = (eps * (8.5 + 2 * g) * 4.4) / Y;
  return V > 0 ? V : null;
}

// ─── 6. P/E Based Relative Valuation ──────────────────────────────────────────
export function peBasedValue(inputs: FinancialInputs): number | null {
  const { eps, sectorPE, peRatio } = inputs;
  if (!eps || eps <= 0) return null;

  const targetPE = sectorPE ?? peRatio ?? 15; // CSE avg P/E ~15x
  return eps * targetPE;
}

// ─── 7. P/B Based Relative Valuation ──────────────────────────────────────────
export function pbBasedValue(inputs: FinancialInputs): number | null {
  const { bookValuePerShare, sectorPB, roe } = inputs;
  if (!bookValuePerShare || bookValuePerShare <= 0) return null;

  // Justified P/B = ROE / cost of equity
  let targetPB = sectorPB ?? 1.5; // CSE avg P/B
  if (roe) {
    const r = wacc(roe);
    const g = SL_DEFAULTS.terminalGrowthRate;
    const justifiedPB = (roe - g) / (r - g);
    targetPB = Math.min(Math.max(justifiedPB, 0.5), 5); // cap 0.5x - 5x
  }

  return bookValuePerShare * targetPB;
}

// ─── 8. EV/EBITDA Based ────────────────────────────────────────────────────────
export function evEbitdaValue(inputs: FinancialInputs): number | null {
  const { ebitda, sharesOutstanding, totalDebt, cash, sectorEVEBITDA } =
    inputs;
  if (!ebitda || ebitda <= 0 || !sharesOutstanding) return null;

  const evMultiple = sectorEVEBITDA ?? 8; // CSE average ~8x
  const enterpriseValue = ebitda * evMultiple;
  const equity =
    enterpriseValue - (totalDebt ?? 0) + (cash ?? 0);
  return equity > 0 ? equity / sharesOutstanding : null;
}

// ─── 9. Residual Income Model ──────────────────────────────────────────────────
export function residualIncomeModel(inputs: FinancialInputs): number | null {
  const { bookValuePerShare, eps, roe, growthRate, discountRate } = inputs;
  if (!bookValuePerShare || !eps || bookValuePerShare <= 0) return null;

  const r = discountRate ?? wacc(roe);
  const g = growthRate ?? SL_DEFAULTS.defaultGrowthRate;
  const excessReturn = eps - r * bookValuePerShare;

  if (r <= g) return null;

  // V = BVPS + PV of residual income stream (perpetuity with growth)
  const pvRI = excessReturn / (r - g);
  return bookValuePerShare + pvRI;
}

// ─── 10. Free Cash Flow to Equity (FCFE) ──────────────────────────────────────
export function fcfEquityValue(inputs: FinancialInputs): number | null {
  const { freeCashFlowPerShare, growthRate, discountRate, roe } = inputs;
  if (!freeCashFlowPerShare || freeCashFlowPerShare <= 0) return null;

  const g = growthRate ?? SL_DEFAULTS.defaultGrowthRate;
  const r = discountRate ?? wacc(roe);
  const gTerminal = SL_DEFAULTS.terminalGrowthRate;

  if (r <= gTerminal) return null;

  // 5-year high growth then terminal
  let pv = 0;
  let fcf = freeCashFlowPerShare;
  for (let t = 1; t <= 5; t++) {
    fcf *= 1 + g;
    pv += fcf / Math.pow(1 + r, t);
  }

  const terminal = (fcf * (1 + gTerminal)) / (r - gTerminal) / Math.pow(1 + r, 5);
  return pv + terminal;
}

// ─── 11. Monte Carlo Simulation ───────────────────────────────────────────────
export function monteCarloValuation(
  inputs: FinancialInputs,
  runs: number = 1000
): MonteCarloResult {
  const {
    eps,
    bookValuePerShare,
    freeCashFlowPerShare,
    dividendPerShare,
    growthRate,
    discountRate,
    roe,
  } = inputs;

  const results: number[] = [];

  for (let i = 0; i < runs; i++) {
    // Randomize key assumptions with realistic distributions
    const randomGrowth =
      (growthRate ?? SL_DEFAULTS.defaultGrowthRate) +
      normalRandom(0, 0.03); // ±3% std dev
    const randomDiscount =
      (discountRate ?? wacc(roe)) + normalRandom(0, 0.015);
    const randomTerminal =
      SL_DEFAULTS.terminalGrowthRate + normalRandom(0, 0.01);
    const randomEPS = (eps ?? 0) * (1 + normalRandom(0, 0.1));
    const randomBVPS = (bookValuePerShare ?? 0) * (1 + normalRandom(0, 0.05));
    const randomFCF =
      (freeCashFlowPerShare ?? eps * 0.6) * (1 + normalRandom(0, 0.15));

    const simInputs: FinancialInputs = {
      ...inputs,
      eps: randomEPS,
      bookValuePerShare: randomBVPS,
      freeCashFlowPerShare: randomFCF,
      dividendPerShare: dividendPerShare
        ? dividendPerShare * (1 + normalRandom(0, 0.1))
        : undefined,
      growthRate: Math.max(0, randomGrowth),
      discountRate: Math.max(0.05, randomDiscount),
      terminalGrowthRate: Math.max(0.01, Math.min(0.06, randomTerminal)),
    };

    const values = [
      dcfTwoStage(simInputs),
      grahamNumber(simInputs),
      peBasedValue(simInputs),
      pbBasedValue(simInputs),
      residualIncomeModel(simInputs),
    ].filter((v): v is number => v !== null && v > 0 && v < 100000);

    if (values.length > 0) {
      results.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }

  results.sort((a, b) => a - b);
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const variance =
    results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length;

  // Sample 100 evenly for histogram
  const step = Math.floor(results.length / 100);
  const distribution = results.filter((_, i) => i % step === 0).slice(0, 100);

  return {
    low: results[Math.floor(results.length * 0.05)],
    median: results[Math.floor(results.length * 0.5)],
    high: results[Math.floor(results.length * 0.95)],
    mean,
    stdDev: Math.sqrt(variance),
    runs: results.length,
    distribution,
  };
}

// ─── Weighted Average & Signal ────────────────────────────────────────────────
export function computeValuation(inputs: FinancialInputs): ValuationResult {
  const dcf = dcfTwoStage(inputs);
  const ddmG = ddmGordonGrowth(inputs);
  const ddmM = ddmMultiStage(inputs);
  const graham = grahamNumber(inputs);
  const grahamF = grahamRevised(inputs);
  const pe = peBasedValue(inputs);
  const pb = pbBasedValue(inputs);
  const evEb = evEbitdaValue(inputs);
  const ri = residualIncomeModel(inputs);
  const fcfe = fcfEquityValue(inputs);
  const mc = inputs.eps > 0 ? monteCarloValuation(inputs) : null;

  // Dynamic weighting based on data availability and reliability
  const rawBreakdown: ValuationBreakdownItem[] = [
    {
      model: "DCF (2-Stage)",
      value: dcf,
      weight: dcf ? 0.22 : 0,
      contribution: null,
      description: "Discounted Cash Flow — projects future FCF at WACC",
      reliability: inputs.freeCashFlowPerShare ? "high" : "medium",
    },
    {
      model: "DDM (Gordon Growth)",
      value: ddmG,
      weight: ddmG ? 0.08 : 0,
      contribution: null,
      description: "Dividend Discount — suitable for dividend-paying stocks",
      reliability: inputs.dividendPerShare ? "high" : "low",
    },
    {
      model: "DDM (Multi-Stage)",
      value: ddmM,
      weight: ddmM ? 0.08 : 0,
      contribution: null,
      description: "Multi-phase dividend growth model",
      reliability: inputs.dividendPerShare ? "medium" : "low",
    },
    {
      model: "Graham Number",
      value: graham,
      weight: graham ? 0.12 : 0,
      contribution: null,
      description:
        "√(22.5 × EPS × BVPS) — Benjamin Graham's defensive value",
      reliability: "high",
    },
    {
      model: "Graham Formula",
      value: grahamF,
      weight: grahamF ? 0.08 : 0,
      contribution: null,
      description: "EPS × (8.5 + 2g) × 4.4/Y — adjusted for SL yields",
      reliability: "medium",
    },
    {
      model: "P/E Relative",
      value: pe,
      weight: pe ? 0.12 : 0,
      contribution: null,
      description: "EPS × sector P/E multiple — relative valuation",
      reliability: "medium",
    },
    {
      model: "P/B Relative",
      value: pb,
      weight: pb ? 0.10 : 0,
      contribution: null,
      description: "BVPS × justified P/B (ROE-based) — book value approach",
      reliability: "medium",
    },
    {
      model: "EV/EBITDA",
      value: evEb,
      weight: evEb ? 0.08 : 0,
      contribution: null,
      description:
        "Enterprise Value ÷ EBITDA multiple — debt-agnostic comparison",
      reliability: inputs.ebitda ? "high" : "low",
    },
    {
      model: "Residual Income",
      value: ri,
      weight: ri ? 0.07 : 0,
      contribution: null,
      description:
        "BVPS + PV(excess returns) — Edwards-Bell-Ohlson model",
      reliability: "medium",
    },
    {
      model: "FCF to Equity",
      value: fcfe,
      weight: fcfe ? 0.05 : 0,
      contribution: null,
      description: "Free Cash Flow to Equity, discounted at cost of equity",
      reliability: inputs.freeCashFlowPerShare ? "high" : "low",
    },
  ];

  // Normalize weights to sum to 1 (only for non-null values)
  const totalWeight = rawBreakdown.reduce((s, b) => s + b.weight, 0);
  const breakdown = rawBreakdown.map((b) => ({
    ...b,
    weight: totalWeight > 0 ? b.weight / totalWeight : 0,
    contribution:
      b.value !== null && totalWeight > 0
        ? (b.value * b.weight) / totalWeight
        : null,
  }));

  // Weighted average intrinsic value
  let weightedAverage = 0;
  let usedWeight = 0;
  for (const b of breakdown) {
    if (b.value !== null && b.value > 0) {
      weightedAverage += b.value * b.weight;
      usedWeight += b.weight;
    }
  }
  if (usedWeight > 0) weightedAverage /= usedWeight;

  // Blend with Monte Carlo median if available
  if (mc) {
    weightedAverage = weightedAverage * 0.7 + mc.median * 0.3;
  }

  // Confidence: how many models produced valid values / total models
  const validModels = breakdown.filter((b) => b.value !== null).length;
  const confidence = validModels / breakdown.length;

  // Upside/downside
  const upsidePercent =
    ((weightedAverage - inputs.marketPrice) / inputs.marketPrice) * 100;

  // Signal thresholds
  let signal: ValuationResult["signal"];
  if (upsidePercent >= 30) signal = "STRONG_BUY";
  else if (upsidePercent >= 15) signal = "BUY";
  else if (upsidePercent >= -10) signal = "HOLD";
  else if (upsidePercent >= -25) signal = "SELL";
  else signal = "STRONG_SELL";

  return {
    dcfValue: dcf,
    ddmGordon: ddmG,
    ddmMultiStage: ddmM,
    grahamNumber: graham,
    grahamFormula: grahamF,
    peBased: pe,
    pbBased: pb,
    psBased: null, // requires revenue/share data
    evEbitdaBased: evEb,
    residualIncome: ri,
    fcfEquity: fcfe,
    mcSimulation: mc,
    weightedAverage,
    confidence,
    upsidePercent,
    signal,
    weights: Object.fromEntries(breakdown.map((b) => [b.model, b.weight])),
    breakdown,
  };
}

// ─── Technical Indicators ─────────────────────────────────────────────────────
export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  rsi14: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr14: number | null;
  adx14: number | null;
  obv: number | null;
  stochasticK: number | null;
  stochasticD: number | null;
  fibLevels: { level: string; price: number }[] | null;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "MODERATE" | "WEAK" | "OVERSOLD" | "OVERBOUGHT";
  technicalSignal: "BUY" | "HOLD" | "SELL";
  technicalScore: number; // -100 to +100
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function computeTechnicals(data: OHLCV[]): TechnicalIndicators {
  if (data.length < 20) {
    return {
      sma20: null, sma50: null, sma200: null,
      ema12: null, ema26: null, macd: null, macdSignal: null, macdHistogram: null,
      rsi14: null, bollingerUpper: null, bollingerMiddle: null, bollingerLower: null,
      atr14: null, adx14: null, obv: null, stochasticK: null, stochasticD: null,
      fibLevels: null, trend: "NEUTRAL", momentum: "WEAK", technicalSignal: "HOLD",
      technicalScore: 0,
    };
  }

  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const volumes = data.map((d) => d.volume);

  const sma = (n: number) => {
    if (closes.length < n) return null;
    return closes.slice(-n).reduce((a, b) => a + b, 0) / n;
  };

  const ema = (n: number): number[] => {
    const k = 2 / (n + 1);
    const result: number[] = [];
    let prev = closes[0];
    for (const c of closes) {
      prev = c * k + prev * (1 - k);
      result.push(prev);
    }
    return result;
  };

  const sma20v = sma(20);
  const sma50v = sma(50);
  const sma200v = sma(200);

  const ema12Arr = ema(12);
  const ema26Arr = ema(26);
  const ema12v = ema12Arr[ema12Arr.length - 1];
  const ema26v = ema26Arr[ema26Arr.length - 1];

  const macdLine = ema12Arr.map((v, i) => v - ema26Arr[i]);
  const macdEma9 = ema(9).slice(-macdLine.length);
  const macdv = macdLine[macdLine.length - 1];
  const macdSignalv = macdEma9[macdEma9.length - 1];

  // RSI
  const rsi14 = (() => {
    const n = 14;
    if (closes.length < n + 1) return null;
    const recent = closes.slice(-(n + 1));
    let gains = 0, losses = 0;
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rs = gains / (losses || 0.001);
    return 100 - 100 / (1 + rs);
  })();

  // Bollinger Bands
  const stdDev = (() => {
    if (!sma20v) return null;
    const slice = closes.slice(-20);
    const variance = slice.reduce((s, c) => s + Math.pow(c - sma20v, 2), 0) / 20;
    return Math.sqrt(variance);
  })();
  const bollingerMiddle = sma20v;
  const bollingerUpper = sma20v && stdDev ? sma20v + 2 * stdDev : null;
  const bollingerLower = sma20v && stdDev ? sma20v - 2 * stdDev : null;

  // ATR
  const atr14 = (() => {
    if (data.length < 15) return null;
    const trs = data.slice(-15).map((d, i, arr) => {
      if (i === 0) return d.high - d.low;
      return Math.max(
        d.high - d.low,
        Math.abs(d.high - arr[i - 1].close),
        Math.abs(d.low - arr[i - 1].close)
      );
    });
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  })();

  // OBV
  const obv = (() => {
    let v = 0;
    for (let i = 1; i < data.length; i++) {
      if (closes[i] > closes[i - 1]) v += volumes[i];
      else if (closes[i] < closes[i - 1]) v -= volumes[i];
    }
    return v;
  })();

  // Stochastic
  const stochasticK = (() => {
    const n = 14;
    if (data.length < n) return null;
    const slice = data.slice(-n);
    const highN = Math.max(...slice.map((d) => d.high));
    const lowN = Math.min(...slice.map((d) => d.low));
    const curr = closes[closes.length - 1];
    return ((curr - lowN) / (highN - lowN || 0.001)) * 100;
  })();

  // Fibonacci retracement
  const fibLevels = (() => {
    if (data.length < 20) return null;
    const slice = data.slice(-52);
    const high = Math.max(...slice.map((d) => d.high));
    const low = Math.min(...slice.map((d) => d.low));
    const diff = high - low;
    return [
      { level: "0%", price: low },
      { level: "23.6%", price: low + 0.236 * diff },
      { level: "38.2%", price: low + 0.382 * diff },
      { level: "50%", price: low + 0.5 * diff },
      { level: "61.8%", price: low + 0.618 * diff },
      { level: "78.6%", price: low + 0.786 * diff },
      { level: "100%", price: high },
    ];
  })();

  // Trend determination
  const curr = closes[closes.length - 1];
  let trend: TechnicalIndicators["trend"] = "NEUTRAL";
  if (sma20v && sma50v && curr > sma20v && sma20v > sma50v) trend = "BULLISH";
  else if (sma20v && sma50v && curr < sma20v && sma20v < sma50v) trend = "BEARISH";

  // Momentum
  let momentum: TechnicalIndicators["momentum"] = "MODERATE";
  if (rsi14 !== null) {
    if (rsi14 > 70) momentum = "OVERBOUGHT";
    else if (rsi14 < 30) momentum = "OVERSOLD";
    else if (rsi14 > 60) momentum = "STRONG";
    else if (rsi14 < 40) momentum = "WEAK";
  }

  // Technical Score
  let score = 0;
  if (trend === "BULLISH") score += 20;
  else if (trend === "BEARISH") score -= 20;
  if (macdv && macdSignalv) {
    if (macdv > macdSignalv) score += 15;
    else score -= 15;
  }
  if (rsi14 !== null) {
    if (rsi14 > 50 && rsi14 < 70) score += 10;
    else if (rsi14 < 50 && rsi14 > 30) score -= 10;
  }
  if (curr && bollingerMiddle) {
    if (curr > bollingerMiddle) score += 10;
    else score -= 10;
  }
  if (stochasticK !== null) {
    if (stochasticK > 50) score += 5;
    else score -= 5;
  }

  const technicalSignal: TechnicalIndicators["technicalSignal"] =
    score >= 20 ? "BUY" : score <= -20 ? "SELL" : "HOLD";

  return {
    sma20: sma20v, sma50: sma50v, sma200: sma200v,
    ema12: ema12v, ema26: ema26v,
    macd: macdv, macdSignal: macdSignalv, macdHistogram: macdv - macdSignalv,
    rsi14, bollingerUpper, bollingerMiddle, bollingerLower,
    atr14, adx14: null, obv, stochasticK, stochasticD: null,
    fibLevels, trend, momentum, technicalSignal, technicalScore: score,
  };
}

// ─── Insider Activity Detector ────────────────────────────────────────────────
export interface InsiderSignal {
  score: number; // 0-1
  flags: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export function detectInsiderActivity(
  announcement: { title: string; category?: string; content?: string },
  volumeSpike?: number, // Current vol / 30-day avg vol
  priceMove?: number // % price move in last session
): InsiderSignal {
  const flags: string[] = [];
  let score = 0;

  const text =
    `${announcement.title} ${announcement.content ?? ""}`.toLowerCase();

  // Keyword matching
  const highRiskKeywords = [
    "acquisition", "takeover", "merger", "buyout", "privatization",
    "strategic review", "material transaction", "tender offer", "delisting",
    "related party transaction", "major shareholder", "change of control",
  ];
  const medRiskKeywords = [
    "rights issue", "new listing", "share issue", "debenture",
    "profit warning", "earnings guidance", "dividend announcement",
    "director resignation", "director appointment", "board change",
  ];

  for (const kw of highRiskKeywords) {
    if (text.includes(kw)) {
      flags.push(`High-risk keyword: "${kw}"`);
      score += 0.2;
    }
  }
  for (const kw of medRiskKeywords) {
    if (text.includes(kw)) {
      flags.push(`Significant keyword: "${kw}"`);
      score += 0.1;
    }
  }

  // Volume spike detection
  if (volumeSpike && volumeSpike > 3) {
    flags.push(`Volume spike: ${volumeSpike.toFixed(1)}x average`);
    score += Math.min(0.3, (volumeSpike - 3) * 0.1);
  }

  // Abnormal price move before announcement
  if (priceMove && Math.abs(priceMove) > 5) {
    flags.push(`Pre-announcement price move: ${priceMove.toFixed(1)}%`);
    score += Math.min(0.2, Math.abs(priceMove) * 0.02);
  }

  const clampedScore = Math.min(1, score);
  const severity: InsiderSignal["severity"] =
    clampedScore >= 0.7
      ? "CRITICAL"
      : clampedScore >= 0.5
      ? "HIGH"
      : clampedScore >= 0.3
      ? "MEDIUM"
      : "LOW";

  return { score: clampedScore, flags, severity };
}

// ─── Utility: Normal Random Number (Box-Muller) ────────────────────────────────
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

// ─── Sentiment Analysis (client-side heuristic + HuggingFace API) ─────────────
export interface SentimentResult {
  score: number; // -1 (very negative) to +1 (very positive)
  label: "positive" | "negative" | "neutral";
  confidence: number;
}

export function analyzeSentimentHeuristic(text: string): SentimentResult {
  const lower = text.toLowerCase();

  const positive = [
    "profit", "growth", "dividend", "beat", "record", "strong", "bullish",
    "buy", "upgrade", "increase", "surge", "rally", "gain", "positive",
    "outperform", "acquisition target", "undervalued", "cheap",
  ];
  const negative = [
    "loss", "decline", "fall", "drop", "sell", "downgrade", "bearish",
    "warning", "miss", "weak", "concern", "risk", "debt", "default",
    "investigation", "fraud", "overvalued", "expensive", "crash",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const w of positive) {
    if (lower.includes(w)) positiveCount++;
  }
  for (const w of negative) {
    if (lower.includes(w)) negativeCount++;
  }

  const total = positiveCount + negativeCount || 1;
  const rawScore = (positiveCount - negativeCount) / total;
  const score = Math.max(-1, Math.min(1, rawScore));
  const label =
    score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral";
  const confidence = Math.min(1, total / 5);

  return { score, label, confidence };
}
