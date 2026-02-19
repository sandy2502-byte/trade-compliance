/**
 * GET /api/compliance/summary
 *
 * Runs the full compliance rule set for every fund and returns
 * an aggregated summary. Used by the compliance dashboard.
 *
 * All funds are processed in parallel; within each fund all rules
 * also run in parallel — same pipeline as /api/compliance/run.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funds, compliance_rules } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { generateAndRunRule, type RuleResult } from "@/lib/compliance-rule-generator";

const DEFAULT_RULES = [
  { id: "R001", text: "max 60% of portfolio in Equity",                          category: "Asset Class"    },
  { id: "R002", text: "no positions with Restricted compliance status",           category: "Regulatory"     },
  { id: "R003", text: "max 30% of portfolio in any single country",               category: "Concentration"  },
  { id: "R004", text: "max 30% of portfolio in any single sector",                category: "Concentration"  },
  { id: "R005", text: "max 40% of portfolio in Bonds",                            category: "Asset Class"    },
  { id: "R006", text: "min 2% of portfolio in Cash",                              category: "Liquidity"      },
  { id: "R007", text: "no single position to exceed 15% of NAV",                  category: "Concentration"  },
  { id: "R008", text: "max 20% of portfolio in Review status positions",           category: "Regulatory"     },
  { id: "R009", text: "max 15% of portfolio in Commodity",                        category: "Asset Class"    },
  { id: "R010", text: "max 50% of portfolio in Equity plus ETF combined",         category: "Asset Class"    },
  { id: "R011", text: "minimum 10 positions in portfolio",                        category: "Diversification" },
  { id: "R012", text: "top 5 holdings max 80% of portfolio",                      category: "Concentration"  },
];

export type FundSummary = {
  fund_id: number;
  fund_name: string;
  fund_type: string;
  aum_usd: number;
  total: number;
  pass: number;
  fail: number;
  error: number;
  pass_rate: number;          // 0–100
  status: "COMPLIANT" | "BREACHES" | "ERROR";
  failing_rules: Array<{ rule_id: string; rule_text: string; category: string }>;
  results: RuleResult[];
};

export async function GET() {
  const allFunds = db.select().from(funds).orderBy(asc(funds.name)).all();

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
    }));

  const allRules = [...DEFAULT_RULES, ...customRules];

  // Run all funds in parallel
  const fundSummaries: FundSummary[] = await Promise.all(
    allFunds.map(async (fund) => {
      const results: RuleResult[] = await Promise.all(
        allRules.map(rule =>
          generateAndRunRule(
            rule.id,
            rule.text,
            rule.category,
            fund.id,
            (rule as { threshold_override?: number }).threshold_override,
          )
        )
      );

      const pass  = results.filter(r => r.status === "PASS").length;
      const fail  = results.filter(r => r.status === "FAIL").length;
      const error = results.filter(r => r.status === "ERROR").length;
      const total = results.length;
      const pass_rate = total > 0 ? Math.round((pass / total) * 100) : 0;

      const failing_rules = results
        .filter(r => r.status === "FAIL")
        .map(r => ({ rule_id: r.rule_id, rule_text: r.rule_text, category: r.category }));

      const status: FundSummary["status"] =
        error > 0 && fail === 0 ? "ERROR"
        : fail > 0 ? "BREACHES"
        : "COMPLIANT";

      return {
        fund_id: fund.id,
        fund_name: fund.name,
        fund_type: fund.fund_type,
        aum_usd: fund.aum_usd,
        total,
        pass,
        fail,
        error,
        pass_rate,
        status,
        failing_rules,
        results,
      };
    })
  );

  // Cross-fund rule failure counts
  const ruleFailCounts: Record<string, { rule_text: string; category: string; count: number }> = {};
  for (const fs of fundSummaries) {
    for (const r of fs.failing_rules) {
      if (!ruleFailCounts[r.rule_id]) {
        ruleFailCounts[r.rule_id] = { rule_text: r.rule_text, category: r.category, count: 0 };
      }
      ruleFailCounts[r.rule_id].count++;
    }
  }

  const top_failing_rules = Object.entries(ruleFailCounts)
    .map(([rule_id, v]) => ({ rule_id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalPass  = fundSummaries.reduce((s, f) => s + f.pass, 0);
  const totalFail  = fundSummaries.reduce((s, f) => s + f.fail, 0);
  const totalError = fundSummaries.reduce((s, f) => s + f.error, 0);
  const totalRules = fundSummaries.reduce((s, f) => s + f.total, 0);
  const compliantFunds = fundSummaries.filter(f => f.status === "COMPLIANT").length;

  return NextResponse.json({
    data: {
      generated_at: new Date().toISOString(),
      funds: fundSummaries,
      top_failing_rules,
      totals: {
        funds: allFunds.length,
        compliant_funds: compliantFunds,
        rules_per_fund: allRules.length,
        total_checks: totalRules,
        pass: totalPass,
        fail: totalFail,
        error: totalError,
        overall_pass_rate: totalRules > 0 ? Math.round((totalPass / totalRules) * 100) : 0,
      },
    },
  });
}
