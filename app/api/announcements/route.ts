import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const insiderOnly = searchParams.get("insiderOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  try {
    let query = db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.publishedAt))
      .limit(limit);

    const rows = await query;

    let filtered = rows;
    if (symbol) {
      filtered = filtered.filter(
        (r) => r.symbol?.toUpperCase() === symbol.toUpperCase()
      );
    }
    if (insiderOnly) {
      filtered = filtered.filter((r) => r.isInsiderFlag === true);
    }

    return NextResponse.json({ announcements: filtered });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}
