/**
 * Seed script — populates initial stock list from CSE API
 * Run: npm run db:seed
 */

import { db } from "../lib/db";
import { stocks } from "../lib/db/schema";
import { fetchAllStocks } from "../lib/cse-api";

// Fallback static list of ~50 major CSE stocks if API unavailable
const FALLBACK_STOCKS = [
  { symbol: "COMB.N0000", name: "Commercial Bank of Ceylon", sector: "Banking", boardType: "Main" },
  { symbol: "HNB.N0000", name: "Hatton National Bank", sector: "Banking", boardType: "Main" },
  { symbol: "SAMP.N0000", name: "Sampath Bank", sector: "Banking", boardType: "Main" },
  { symbol: "NTB.N0000", name: "Nations Trust Bank", sector: "Banking", boardType: "Main" },
  { symbol: "BOC.N0000", name: "Bank of Ceylon", sector: "Banking", boardType: "Main" },
  { symbol: "LOLC.N0000", name: "LOLC Holdings", sector: "Diversified", boardType: "Main" },
  { symbol: "JKH.N0000", name: "John Keells Holdings", sector: "Diversified", boardType: "Main" },
  { symbol: "HAYL.N0000", name: "Hayleys", sector: "Diversified", boardType: "Main" },
  { symbol: "LION.N0000", name: "Lion Brewery", sector: "Beverage", boardType: "Main" },
  { symbol: "CTC.N0000", name: "Ceylon Tobacco Company", sector: "Manufacturing", boardType: "Main" },
  { symbol: "DIPD.N0000", name: "Dipped Products", sector: "Manufacturing", boardType: "Main" },
  { symbol: "REXP.N0000", name: "Richard Pieris Exports", sector: "Manufacturing", boardType: "Main" },
  { symbol: "DIAL.N0000", name: "Dialog Axiata", sector: "Telecom", boardType: "Main" },
  { symbol: "SLTL.N0000", name: "Sri Lanka Telecom", sector: "Telecom", boardType: "Main" },
  { symbol: "SHL.N0000", name: "Sunshine Holdings", sector: "Diversified", boardType: "Main" },
  { symbol: "OSEA.N0000", name: "Overseas Realty", sector: "Property", boardType: "Main" },
  { symbol: "CINS.N0000", name: "Ceylinco Insurance", sector: "Insurance", boardType: "Main" },
  { symbol: "UNTU.N0000", name: "Union Assurance", sector: "Insurance", boardType: "Main" },
  { symbol: "CTHR.N0000", name: "Ceylon Tea & Rubber", sector: "Plantation", boardType: "Main" },
  { symbol: "WAPO.N0000", name: "Watawala Plantations", sector: "Plantation", boardType: "Main" },
];

async function seed() {
  console.log("🌱 Seeding CSE stock database...");

  let stockList = FALLBACK_STOCKS;

  try {
    console.log("  → Fetching from CSE API...");
    const apiStocks = await fetchAllStocks();
    if (apiStocks.length > 0) {
      stockList = apiStocks;
      console.log(`  → Got ${apiStocks.length} stocks from API`);
    }
  } catch (e) {
    console.log("  → API unavailable, using fallback list");
  }

  let inserted = 0;
  for (const stock of stockList) {
    try {
      await db.insert(stocks).values({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        boardType: stock.boardType,
      }).onConflictDoNothing();
      inserted++;
    } catch {
      // Skip duplicates
    }
  }

  console.log(`✅ Seeded ${inserted} stocks`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
