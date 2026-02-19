/**
 * Compliance Rule Generator
 *
 * Implements the compliance-rule-generator skill in TypeScript.
 *
 * For each plain-English rule:
 *   1. Classify the rule (type, threshold, direction) — local regex logic
 *   2. Build natural-language queries describing the data needed
 *   3. Call text2sql() for each NL query → get SQL (generation time)
 *   4. Execute SQL via better-sqlite3 (runtime)
 *   5. Evaluate pass/fail and return a structured result dict
 *
 * This mirrors the Python skill's exec()-based approach but runs natively
 * in Next.js, with text2sql() called explicitly at API request time.
 */

import Database from "better-sqlite3";
import path from "path";
import { text2sql } from "./text2sql";

const DB_PATH = path.join(process.cwd(), "portfolio.db");

// ---------------------------------------------------------------------------
// execute_sql — runtime SQL execution (better-sqlite3, synchronous)
// Returns rows as array of objects.
// ---------------------------------------------------------------------------
function execute_sql(sql: string): Record<string, unknown>[] {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare(sql).all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Rule classification — local, no API call
// Extracts: type, direction, threshold, subject
// ---------------------------------------------------------------------------

type RuleClass = {
  ruleType: "MAX_PCT_NAV" | "MIN_PCT_NAV" | "PROHIBITED" | "MAX_COUNT" | "MIN_COUNT" | "CONCENTRATION";
  direction: "max" | "min" | "prohibited" | "count";
  threshold: number;
  unit: string;
};

function classifyRule(ruleText: string, thresholdOverride?: number): RuleClass {
  const t = ruleText.toLowerCase();

  // Extract numeric threshold from rule text
  const numMatch = ruleText.match(/(\d+(?:\.\d+)?)/);
  const extractedThreshold = numMatch ? parseFloat(numMatch[1]) : 0;
  const threshold = thresholdOverride ?? extractedThreshold;

  if (/prohibited|not permitted|no .*(positions|positions with|selling)/i.test(t)) {
    return { ruleType: "PROHIBITED", direction: "prohibited", threshold: 0, unit: "count" };
  }
  if (/min(?:imum)?\s+\d+\s+position/i.test(t)) {
    return { ruleType: "MIN_COUNT", direction: "count", threshold, unit: "count" };
  }
  if (/top\s+\d+/i.test(t) && /max/i.test(t)) {
    // "top 5 holdings max 80%" — threshold is the number after "max", not "top N"
    const maxMatch = ruleText.match(/max\s+(\d+(?:\.\d+)?)/i);
    const topNThreshold = thresholdOverride ?? (maxMatch ? parseFloat(maxMatch[1]) : extractedThreshold);
    return { ruleType: "CONCENTRATION", direction: "max", threshold: topNThreshold, unit: "% of NAV" };
  }
  if (/any single (country|sector|position|issuer)/i.test(t) && /max/i.test(t)) {
    return { ruleType: "CONCENTRATION", direction: "max", threshold, unit: "% of NAV" };
  }
  if (/no single position/i.test(t)) {
    return { ruleType: "CONCENTRATION", direction: "max", threshold, unit: "% of NAV" };
  }
  if (/min(?:imum)?\s+\d+%/i.test(t)) {
    return { ruleType: "MIN_PCT_NAV", direction: "min", threshold, unit: "% of NAV" };
  }
  // Default: max % of NAV
  return { ruleType: "MAX_PCT_NAV", direction: "max", threshold, unit: "% of NAV" };
}

// ---------------------------------------------------------------------------
// NL query builder — produces precise NL queries for text2sql
// text2sql is called once per query to get the SQL at "generation time"
// ---------------------------------------------------------------------------

function buildNLQueries(
  ruleText: string,
  ruleClass: RuleClass,
  fundId: number
): { metric: string; breach?: string } {
  const t = ruleText.toLowerCase();

  // Concentration — single country
  if (/single country/i.test(t)) {
    return {
      metric: `Total weight_pct grouped by country for all positions in fund ${fundId}, ordered by total weight descending`,
      breach: `All positions in fund ${fundId} with country, security_name, COALESCE(isin, ticker) as identifier, weight_pct — ordered by weight_pct descending`,
    };
  }

  // Concentration — single sector
  if (/single sector/i.test(t)) {
    return {
      metric: `Total weight_pct grouped by sector for all positions in fund ${fundId}, ordered by total weight descending`,
      breach: `All positions in fund ${fundId} with sector, security_name, COALESCE(isin, ticker) as identifier, weight_pct — ordered by weight_pct descending`,
    };
  }

  // Concentration — single position
  if (/single position/i.test(t)) {
    return {
      metric: `All positions in fund ${fundId} with security_name, COALESCE(isin, ticker) as identifier, weight_pct — ordered by weight_pct descending`,
    };
  }

  // Top-N holdings
  if (/top\s+(\d+) holdings/i.test(t)) {
    const n = (t.match(/top\s+(\d+)/i) ?? [])[1] ?? "5";
    return {
      metric: `Sum of weight_pct for the ${n} positions with highest weight_pct in fund ${fundId}`,
      breach: `The ${n} positions with highest weight_pct in fund ${fundId}, showing security_name, COALESCE(isin, ticker) as identifier, weight_pct`,
    };
  }

  // Minimum position count
  if (/minimum \d+ position/i.test(t)) {
    return { metric: `Count of all positions in fund ${fundId}` };
  }

  // No restricted positions
  if (/restricted/i.test(t) && /no positions/i.test(t)) {
    return {
      metric: `Count of positions in fund ${fundId} where compliance_status is Restricted`,
      breach: `All positions in fund ${fundId} where compliance_status is Restricted, showing security_name, COALESCE(isin, ticker) as identifier, weight_pct`,
    };
  }

  // Review status exposure
  if (/review status/i.test(t)) {
    return {
      metric: `Total weight_pct of positions in fund ${fundId} where compliance_status is Review`,
      breach: `All positions in fund ${fundId} where compliance_status is Review, showing security_name, COALESCE(isin, ticker) as identifier, weight_pct — ordered by weight_pct descending`,
    };
  }

  // Asset class rules — detect the asset class
  const assetClassMap: Record<string, string> = {
    equity: "Equity",
    bond: "Bond",
    bonds: "Bond",
    "fixed income": "Bond",
    etf: "ETF",
    commodity: "Commodity",
    commodities: "Commodity",
    cash: "Cash",
  };

  // Equity + ETF combined
  if (/equity.*etf|etf.*equity/i.test(t)) {
    return {
      metric: `Total weight_pct for positions in fund ${fundId} where asset_class is Equity or ETF`,
      breach: `All positions in fund ${fundId} where asset_class is Equity or ETF, showing security_name, COALESCE(isin, ticker) as identifier, weight_pct — ordered by weight_pct descending`,
    };
  }

  for (const [term, acValue] of Object.entries(assetClassMap)) {
    if (t.includes(term)) {
      return {
        metric: `Total weight_pct for ${acValue} asset class positions in fund ${fundId}`,
        breach: `All ${acValue} positions in fund ${fundId} showing security_name, COALESCE(isin, ticker) as identifier, weight_pct ordered by weight_pct descending`,
      };
    }
  }

  // Fallback
  return { metric: `Total weight_pct for all positions in fund ${fundId} matching rule: ${ruleText}` };
}

// ---------------------------------------------------------------------------
// Result type (matches the shape from the original API route)
// ---------------------------------------------------------------------------

export type RuleResult = {
  rule_id: string;
  rule_text: string;
  category: string;
  status: "PASS" | "FAIL" | "ERROR";
  metric_value: number | null;
  threshold: number;
  unit: string;
  message: string;
  breach_count: number;
  breaches: Array<{ identifier: string; description: string; value: number }>;
  generated_sql?: string; // SQL generated by text2sql for transparency
};

// ---------------------------------------------------------------------------
// Core: generate SQL via text2sql, execute, evaluate
// ---------------------------------------------------------------------------

export async function generateAndRunRule(
  ruleId: string,
  ruleText: string,
  category: string,
  fundId: number,
  thresholdOverride?: number
): Promise<RuleResult> {
  const ruleClass = classifyRule(ruleText, thresholdOverride);
  const { threshold, direction, unit } = ruleClass;

  let generatedSql = "";

  try {
    const nlQueries = buildNLQueries(ruleText, ruleClass, fundId);

    // --- GENERATION TIME: call text2sql for each NL query ---
    const sqlMetric = await text2sql(nlQueries.metric);
    generatedSql = sqlMetric;

    // --- RUNTIME: execute the generated SQL ---
    const metricRows = execute_sql(sqlMetric);

    // ---- Evaluate based on rule classification ----

    // PROHIBITED — count must be 0
    if (direction === "prohibited") {
      const count = Number(Object.values(metricRows[0] ?? {})[0] ?? 0);
      const passed = count === 0;
      let breaches: RuleResult["breaches"] = [];
      if (!passed && nlQueries.breach) {
        const sqlBreach = await text2sql(nlQueries.breach);
        const breachRows = execute_sql(sqlBreach);
        breaches = breachRows.map(rowToBreachItem);
      }
      return {
        rule_id: ruleId, rule_text: ruleText, category,
        status: passed ? "PASS" : "FAIL",
        metric_value: count, threshold: 0, unit: "count",
        message: passed
          ? `No prohibited positions found.`
          : `${count} prohibited position(s) found — rule breached.`,
        breach_count: breaches.length, breaches, generated_sql: sqlMetric,
      };
    }

    // MIN_COUNT / MAX_COUNT
    if (direction === "count") {
      const count = Number(Object.values(metricRows[0] ?? {})[0] ?? 0);
      const passed = direction === "count" && ruleClass.ruleType === "MIN_COUNT"
        ? count >= threshold
        : count <= threshold;
      return {
        rule_id: ruleId, rule_text: ruleText, category,
        status: passed ? "PASS" : "FAIL",
        metric_value: count, threshold, unit: "count",
        message: `Portfolio has ${count} positions, ${passed ? "meets" : "does not meet"} ${ruleClass.ruleType === "MIN_COUNT" ? "minimum" : "maximum"} of ${threshold}.`,
        breach_count: 0, breaches: [], generated_sql: sqlMetric,
      };
    }

    // CONCENTRATION — multiple rows returned
    if (ruleClass.ruleType === "CONCENTRATION" && metricRows.length > 1) {
      const colCount = Object.keys(metricRows[0] ?? {}).length;

      if (colCount === 2) {
        // GROUP concentration (country / sector): columns are [group_key, weight]
        const vals = metricRows.map(r => ({ key: String(Object.values(r)[0]), weight: Number(Object.values(r)[1] ?? 0) }));
        const maxEntry = vals.reduce((best, v) => v.weight > best.weight ? v : best, { key: "", weight: 0 });
        const passed = maxEntry.weight <= threshold;
        const breaches: RuleResult["breaches"] = passed ? [] : vals
          .filter(v => v.weight > threshold)
          .map(v => ({ identifier: v.key, description: v.key, value: v.weight }));
        return {
          rule_id: ruleId, rule_text: ruleText, category,
          status: passed ? "PASS" : "FAIL",
          metric_value: round(maxEntry.weight), threshold, unit,
          message: `Max concentration is ${maxEntry.weight.toFixed(2)}% (${maxEntry.key}), ${passed ? "within" : "exceeds"} max ${threshold}%.`,
          breach_count: breaches.length, breaches, generated_sql: sqlMetric,
        };
      }

      // PER-POSITION concentration: columns are [description, identifier, weight] — weight is last
      const sorted = metricRows
        .map(r => {
          const vals = Object.values(r);
          return {
            description: String(vals[0] ?? ""),
            identifier: String(vals[1] ?? vals[0] ?? ""),
            weight: Number(vals[vals.length - 1] ?? 0),
          };
        })
        .sort((a, b) => b.weight - a.weight);
      const maxWeight = sorted[0]?.weight ?? 0;
      const passed = maxWeight <= threshold;
      const breaches = passed ? [] : sorted.filter(p => p.weight > threshold).map(p => ({
        identifier: p.identifier, description: p.description, value: p.weight,
      }));
      return {
        rule_id: ruleId, rule_text: ruleText, category,
        status: passed ? "PASS" : "FAIL",
        metric_value: round(maxWeight), threshold, unit,
        message: `Largest position is ${maxWeight.toFixed(2)}% (${sorted[0]?.description ?? "—"}), ${passed ? "within" : "exceeds"} max ${threshold}%.`,
        breach_count: breaches.length, breaches, generated_sql: sqlMetric,
      };
    }

    // CONCENTRATION — single aggregate row (top-N sum) or empty result set
    if (ruleClass.ruleType === "CONCENTRATION") {
      const val = Number(Object.values(metricRows[0] ?? {})[0] ?? 0);
      const passed = val <= threshold;
      let breaches: RuleResult["breaches"] = [];
      if (!passed && nlQueries.breach) {
        const sqlBreach = await text2sql(nlQueries.breach);
        const breachRows = execute_sql(sqlBreach);
        breaches = breachRows.map(rowToBreachItem);
      }
      return {
        rule_id: ruleId, rule_text: ruleText, category,
        status: passed ? "PASS" : "FAIL",
        metric_value: round(val), threshold, unit,
        message: `Value is ${val.toFixed(2)}%, ${passed ? "within" : "exceeds"} max ${threshold}%.`,
        breach_count: breaches.length, breaches, generated_sql: sqlMetric,
      };
    }

    // MAX_PCT_NAV / MIN_PCT_NAV — single value returned
    const metricVal = Number(Object.values(metricRows[0] ?? {})[0] ?? 0);
    const passed = direction === "min" ? metricVal >= threshold : metricVal <= threshold;

    let breaches: RuleResult["breaches"] = [];
    if (!passed && nlQueries.breach) {
      const sqlBreach = await text2sql(nlQueries.breach);
      const breachRows = execute_sql(sqlBreach);
      breaches = breachRows.map(rowToBreachItem);
    }

    return {
      rule_id: ruleId, rule_text: ruleText, category,
      status: passed ? "PASS" : "FAIL",
      metric_value: round(metricVal), threshold, unit,
      message: `${ruleText}: ${metricVal.toFixed(2)}%, ${passed ? (direction === "min" ? "meets" : "within") : (direction === "min" ? "below" : "exceeds")} ${direction} ${threshold}%.`,
      breach_count: breaches.length, breaches, generated_sql: sqlMetric,
    };

  } catch (err) {
    return {
      rule_id: ruleId, rule_text: ruleText, category,
      status: "ERROR",
      metric_value: null,
      threshold: ruleClass.threshold,
      unit: ruleClass.unit,
      message: `Error: ${String(err)}`,
      breach_count: 0, breaches: [],
      generated_sql: generatedSql,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToBreachItem(row: Record<string, unknown>): { identifier: string; description: string; value: number } {
  const vals = Object.values(row);
  return {
    identifier: String(vals[0] ?? ""),
    description: String(vals[1] ?? vals[0] ?? ""),
    value: Number(vals[vals.length - 1] ?? 0),
  };
}

function round(n: number, dp = 4): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}
