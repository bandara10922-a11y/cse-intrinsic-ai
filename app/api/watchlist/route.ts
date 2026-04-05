import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchTodaySharePrice } from "@/lib/cse-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "demo-user-001";

  const items = await db.select().from(watchlist).where(eq(watchlist.userId, userId));

  const enriched = await Promise.all(
    items.map(async (item) => {
      const price = await fetchTodaySharePrice(item.symbol).catch(() => null);
      const triggered =
        item.alertPrice && price
          ? item.alertDirection === "above"
            ? price.closingPrice >= item.alertPrice
            : price.closingPrice <= item.alertPrice
          : false;
      return {
        ...item,
        currentPrice: price?.closingPrice ?? null,
        change: price?.change ?? null,
        changePercent: price?.percentageChange ?? null,
        alertTriggered: triggered,
      };
    })
  );

  return NextResponse.json({ watchlist: enriched });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId = "demo-user-001", symbol, alertPrice, alertDirection } = body;

  const item = await db.insert(watchlist).values({
    userId, symbol: symbol.toUpperCase(), alertPrice, alertDirection,
  }).returning();

  return NextResponse.json({ item: item[0] });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId") ?? "demo-user-001";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(watchlist).where(
    and(eq(watchlist.id, parseInt(id)), eq(watchlist.userId, userId))
  );
  return NextResponse.json({ success: true });
}
