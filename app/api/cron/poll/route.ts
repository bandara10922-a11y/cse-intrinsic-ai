import { NextResponse } from "next/server";
import { pollMarketData, crawlAnnouncements } from "@/lib/market-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron: runs every minute, market-engine decides whether to poll
export async function GET(request: Request) {
  // Verify it's a cron request or internal
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.allSettled([
    pollMarketData(),
    crawlAnnouncements(),
  ]);

  const pollResult =
    results[0].status === "fulfilled" ? results[0].value : { success: false, message: String(results[0].reason) };
  const announcementCount =
    results[1].status === "fulfilled" ? results[1].value : 0;

  return NextResponse.json({
    poll: pollResult,
    newAnnouncements: announcementCount,
    timestamp: new Date().toISOString(),
  });
}
