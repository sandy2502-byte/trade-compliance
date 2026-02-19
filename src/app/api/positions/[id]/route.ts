import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [row] = db.select().from(positions).where(eq(positions.id, numId)).all();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();

  const updated = db
    .update(positions)
    .set({
      fund_id: Number(body.fund_id),
      security_name: body.security_name,
      ticker: body.ticker,
      isin: body.isin === "" ? null : body.isin ?? null,
      asset_class: body.asset_class,
      country: body.country,
      sector: body.sector,
      quantity: Number(body.quantity),
      price_usd: Number(body.price_usd),
      market_value_usd: Number(body.market_value_usd),
      weight_pct: Number(body.weight_pct),
      compliance_status: body.compliance_status,
    })
    .where(eq(positions.id, numId))
    .returning()
    .all();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: updated[0] });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  db.delete(positions).where(eq(positions.id, numId)).run();
  return NextResponse.json({ success: true });
}
