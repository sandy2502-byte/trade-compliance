"use client";

import { useState } from "react";
import Link from "next/link";
import type { FundSummary } from "@/app/api/compliance/summary/route";

type SummaryData = {
  generated_at: string;
  funds: FundSummary[];
  top_failing_rules: Array<{ rule_id: string; rule_text: string; category: string; count: number }>;
  totals: {
    funds: number;
    compliant_funds: number;
    rules_per_fund: number;
    total_checks: number;
    pass: number;
    fail: number;
    error: number;
    overall_pass_rate: number;
  };
};

const fundStatusConfig = {
  COMPLIANT: {
    label: "Compliant",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    border: "border-green-200 dark:border-green-900",
    ring: "ring-green-500",
    bar: "bg-green-500",
  },
  BREACHES: {
    label: "Breaches",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    border: "border-red-200 dark:border-red-900",
    ring: "ring-red-500",
    bar: "bg-red-500",
  },
  ERROR: {
    label: "Error",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-900",
    ring: "ring-yellow-500",
    bar: "bg-yellow-500",
  },
};

const categoryColors: Record<string, string> = {
  "Asset Class":    "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "Concentration":  "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  "Regulatory":     "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  "Liquidity":      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  "Diversification":"bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  "Exposure":       "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  "Custom":         "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ComplianceDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SummaryData | null>(null);
  const [expandedFund, setExpandedFund] = useState<number | null>(null);

  function runAll() {
    setLoading(true);
    setData(null);
    setExpandedFund(null);
    fetch("/api/compliance/summary")
      .then((r) => r.json() as Promise<{ data: SummaryData }>)
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Compliance Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Run compliance rules across all funds simultaneously and compare health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Last run {formatTime(data.generated_at)}
            </span>
          )}
          <button
            onClick={runAll}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running all funds…" : "Run All Funds"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-12 text-center dark:border-blue-900 dark:bg-blue-950/20">
          <div className="mb-3 flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Generating SQL and running compliance rules across all funds…
            </p>
          </div>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            Claude haiku is generating SQL for each rule via text2sql + semantic layer
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No results yet</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Click &quot;Run All Funds&quot; to generate a compliance summary across all funds.
          </p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-8">

          {/* ── Overall stats ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Compliant Funds",
                value: `${data.totals.compliant_funds} / ${data.totals.funds}`,
                color: data.totals.compliant_funds === data.totals.funds
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400",
              },
              {
                label: "Overall Pass Rate",
                value: `${data.totals.overall_pass_rate}%`,
                color: data.totals.overall_pass_rate >= 80
                  ? "text-green-700 dark:text-green-400"
                  : data.totals.overall_pass_rate >= 60
                  ? "text-yellow-700 dark:text-yellow-400"
                  : "text-red-700 dark:text-red-400",
              },
              {
                label: "Total Checks",
                value: data.totals.total_checks.toString(),
                color: "text-zinc-900 dark:text-white",
              },
              {
                label: "Total Breaches",
                value: data.totals.fail.toString(),
                color: data.totals.fail === 0
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Fund cards ────────────────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Fund Compliance Health
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.funds.map((fund) => {
                const cfg = fundStatusConfig[fund.status];
                const isExpanded = expandedFund === fund.fund_id;
                return (
                  <div
                    key={fund.fund_id}
                    className={`rounded-xl border bg-white dark:bg-zinc-900 ${cfg.border} overflow-hidden`}
                  >
                    {/* Card header */}
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{fund.fund_name}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">{fund.fund_type} · {fmt(fund.aum_usd)} AUM</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Pass rate bar */}
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                          <span>Pass rate</span>
                          <span className="font-medium">{fund.pass_rate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-2 rounded-full transition-all ${cfg.bar}`}
                            style={{ width: `${fund.pass_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Pass/Fail/Error counts */}
                      <div className="mb-4 flex gap-3 text-xs">
                        <span className="text-green-600 dark:text-green-400">✓ {fund.pass} pass</span>
                        {fund.fail > 0  && <span className="text-red-600 dark:text-red-400">✗ {fund.fail} fail</span>}
                        {fund.error > 0 && <span className="text-yellow-600 dark:text-yellow-400">⚠ {fund.error} error</span>}
                      </div>

                      {/* Top failing rules (collapsed preview) */}
                      {fund.failing_rules.length > 0 && (
                        <div className="mb-4 space-y-1.5">
                          {fund.failing_rules.slice(0, 3).map((r) => (
                            <div key={r.rule_id} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{r.rule_text}</span>
                            </div>
                          ))}
                          {fund.failing_rules.length > 3 && (
                            <p className="pl-3.5 text-xs text-zinc-400">
                              +{fund.failing_rules.length - 3} more failing rules
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <Link
                          href="/compliance-check"
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          View in Compliance Check →
                        </Link>
                        {fund.fail > 0 && (
                          <button
                            onClick={() => setExpandedFund(isExpanded ? null : fund.fund_id)}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {isExpanded ? "Hide details" : "Show all results"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded — full results table */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-zinc-400 dark:text-zinc-500">
                              <th className="pb-2 pr-3">ID</th>
                              <th className="pb-2 pr-3">Rule</th>
                              <th className="pb-2 pr-3 text-center">Status</th>
                              <th className="pb-2 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                            {fund.results.map((r) => (
                              <tr key={r.rule_id}>
                                <td className="py-1.5 pr-3 font-mono text-zinc-400">{r.rule_id}</td>
                                <td className="py-1.5 pr-3 text-zinc-700 dark:text-zinc-300">{r.rule_text}</td>
                                <td className="py-1.5 pr-3 text-center">
                                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                    r.status === "PASS"  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    r.status === "FAIL"  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}>{r.status}</span>
                                </td>
                                <td className="py-1.5 text-right text-zinc-500">
                                  {r.metric_value != null ? `${r.metric_value.toFixed(1)}${r.unit.includes("%") ? "%" : ""}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Top failing rules across funds ────────────────────── */}
          {data.top_failing_rules.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Most Breached Rules
              </h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      <th className="px-4 py-3">Rule ID</th>
                      <th className="px-4 py-3">Rule</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Funds Breaching</th>
                      <th className="px-4 py-3 text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                    {data.top_failing_rules.map((r) => (
                      <tr key={r.rule_id}>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{r.rule_id}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{r.rule_text}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[r.category] ?? categoryColors["Custom"]}`}>
                            {r.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">
                          {r.count} / {data.totals.funds}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Severity dots */}
                          <span className="flex items-center justify-end gap-0.5">
                            {Array.from({ length: data.totals.funds }).map((_, i) => (
                              <span
                                key={i}
                                className={`h-2 w-2 rounded-full ${i < r.count ? "bg-red-400" : "bg-zinc-200 dark:bg-zinc-700"}`}
                              />
                            ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
