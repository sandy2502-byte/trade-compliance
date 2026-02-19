/**
 * PATCH  /api/compliance/rules/[id]  — toggle enabled / update fields
 * DELETE /api/compliance/rules/[id]  — remove rule
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compliance_rules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json() as { enabled?: boolean; notes?: string };

  const [row] = db
    .update(compliance_rules)
    .set(body)
    .where(eq(compliance_rules.id, numId))
    .returning()
    .all();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  db.delete(compliance_rules).where(eq(compliance_rules.id, numId)).run();
  return NextResponse.json({ success: true });
}
