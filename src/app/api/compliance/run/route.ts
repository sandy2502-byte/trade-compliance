/**
 * GET /api/compliance/run?fund_id=1
 *
 * Runs the compliance-batch-runner skill pipeline for a fund:
 *   1. Loads the 12 default rules
 *   2. For each rule, calls the compliance-rule-generator skill which:
 *      a. Classifies the rule (local)
 *      b. Builds natural language queries (local)
 *      c. Calls text2sql() → generates SQL using the semantic layer + Claude haiku
 *      d. Executes the SQL via better-sqlite3
 *      e. Evaluates pass/fail
 *   3. Returns aggregated results
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funds, compliance_rules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAndRunRule, type RuleResult } from "@/lib/compliance-rule-generator";

// Default rule set — matches compliance_rules.xlsx
const DEFAULT_RULES = [
  { id: "R001", text: "max 60% of portfolio in Equity",                          category: "Asset Class",   enabled: true },
  { id: "R002", text: "no positions with Restricted compliance status",           category: "Regulatory",    enabled: true },
  { id: "R003", text: "max 30% of portfolio in any single country",               category: "Concentration", enabled: true },
  { id: "R004", text: "max 30% of portfolio in any single sector",                category: "Concentration", enabled: true },
  { id: "R005", text: "max 40% of portfolio in Bonds",                            category: "Asset Class",   enabled: true },
  { id: "R006", text: "min 2% of portfolio in Cash",                              category: "Liquidity",     enabled: true },
  { id: "R007", text: "no single position to exceed 15% of NAV",                  category: "Concentration", enabled: true },
  { id: "R008", text: "max 20% of portfolio in Review status positions",           category: "Regulatory",    enabled: true },
  { id: "R009", text: "max 15% of portfolio in Commodity",                        category: "Asset Class",   enabled: true },
  { id: "R010", text: "max 50% of portfolio in Equity plus ETF combined",         category: "Asset Class",   enabled: true },
  { id: "R011", text: "minimum 10 positions in portfolio",                        category: "Diversification", enabled: true },
  { id: "R012", text: "top 5 holdings max 80% of portfolio",                      category: "Concentration", enabled: true },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fundId = Number(searchParams.get("fund_id"));
  if (isNaN(fundId)) {
    return NextResponse.json({ error: "fund_id is required" }, { status: 400 });
  }

  const [fund] = db.select().from(funds).where(eq(funds.id, fundId)).all();
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  // Load custom rules from DB and merge with defaults
  const customRules = db
    .select()
    .from(compliance_rules)
    .all()
    .filter(r => r.enabled)
    .map(r => ({
      id: r.rule_id,
      text: r.rule_text,
      category: r.category,
      threshold_override: r.threshold_override ?? undefined,
      enabled: true,
    }));

  const allRules = [
    ...DEFAULT_RULES.filter(r => r.enabled),
    ...customRules,
  ];

  // Run all enabled rules in parallel through the skill pipeline
  const results: RuleResult[] = await Promise.all(
    allRules.map(rule =>
      generateAndRunRule(rule.id, rule.text, rule.category, fundId, rule.threshold_override)
    )
  );

  const pass_count  = results.filter(r => r.status === "PASS").length;
  const fail_count  = results.filter(r => r.status === "FAIL").length;
  const error_count = results.filter(r => r.status === "ERROR").length;

  return NextResponse.json({
    data: {
      fund,
      results,
      summary: {
        pass: pass_count,
        fail: fail_count,
        error: error_count,
        total: results.length,
      },
    },
  });
}
