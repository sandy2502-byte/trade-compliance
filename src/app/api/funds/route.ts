import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funds } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = db.select().from(funds).orderBy(asc(funds.name)).all();
  return NextResponse.json({ data: rows });
}
