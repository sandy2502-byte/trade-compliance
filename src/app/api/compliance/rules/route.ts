/**
 * GET  /api/compliance/rules  — list all custom rules
 * POST /api/compliance/rules  — add a new custom rule
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compliance_rules } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = db
    .select()
    .from(compliance_rules)
    .orderBy(asc(compliance_rules.id))
    .all();
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    rule_text?: string;
    category?: string;
    threshold_override?: number | null;
    notes?: string;
  };

  if (!body.rule_text?.trim()) {
    return NextResponse.json({ error: "rule_text is required" }, { status: 400 });
  }

  // Auto-generate rule_id: CR001, CR002, …
  const existing = db.select({ id: compliance_rules.id }).from(compliance_rules).all();
  const nextNum = (existing.length + 1).toString().padStart(3, "0");
  const ruleId = `CR${nextNum}`;

  const [row] = db
    .insert(compliance_rules)
    .values({
      rule_id: ruleId,
      rule_text: body.rule_text.trim(),
      category: body.category?.trim() || "Custom",
      threshold_override: body.threshold_override ?? null,
      notes: body.notes?.trim() || null,
      enabled: true,
      created_at: new Date().toISOString(),
    })
    .returning()
    .all();

  return NextResponse.json({ data: row }, { status: 201 });
}
