import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { eq, like, and, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fund_id = searchParams.get("fund_id");
  const asset_class = searchParams.get("asset_class");
  const country = searchParams.get("country");
  const compliance_status = searchParams.get("compliance_status");
  const search = searchParams.get("search");

  const conditions: SQL[] = [];

  if (fund_id) conditions.push(eq(positions.fund_id, Number(fund_id)));
  if (asset_class) conditions.push(eq(positions.asset_class, asset_class));
  if (country) conditions.push(eq(positions.country, country));
  if (compliance_status)
    conditions.push(eq(positions.compliance_status, compliance_status));
  if (search) {
    conditions.push(
      or(
        like(positions.security_name, `%${search}%`),
        like(positions.ticker, `%${search}%`)
      )!
    );
  }

  const rows =
    conditions.length > 0
      ? db
          .select()
          .from(positions)
          .where(and(...conditions))
          .all()
      : db.select().from(positions).all();

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { fund_id, security_name, ticker, asset_class, country, sector, quantity, price_usd, market_value_usd, weight_pct, compliance_status } = body;

  if (!fund_id || !security_name || !ticker || !asset_class || !country || !sector || quantity == null || price_usd == null || market_value_usd == null || weight_pct == null || !compliance_status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [row] = db
    .insert(positions)
    .values({
      fund_id: Number(fund_id),
      security_name,
      ticker,
      isin: body.isin || null,
      asset_class,
      country,
      sector,
      quantity: Number(quantity),
      price_usd: Number(price_usd),
      market_value_usd: Number(market_value_usd),
      weight_pct: Number(weight_pct),
      compliance_status,
    })
    .returning()
    .all();

  return NextResponse.json({ data: row }, { status: 201 });
}
