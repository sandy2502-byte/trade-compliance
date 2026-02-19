"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fund } from "@/lib/db/schema";

type RuleResult = {
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
  generated_sql?: string;
};

type RunData = {
  fund: Fund;
  results: RuleResult[];
  summary: { pass: number; fail: number; error: number; total: number };
};

const statusStyle: Record<string, string> = {
  PASS:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAIL:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ERROR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const rowBg: Record<string, string> = {
  PASS:  "",
  FAIL:  "bg-red-50 dark:bg-red-950/20",
  ERROR: "bg-yellow-50 dark:bg-yellow-950/20",
};

export default function ComplianceCheckPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RunData | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/funds")
      .then((r) => r.json() as Promise<{ data: Fund[] }>)
      .then(({ data }) => {
        setFunds(data);
        if (data.length > 0) setSelectedFundId(String(data[0].id));
      })
      .catch(() => {});
  }, []);

  function runCheck() {
    if (!selectedFundId) return;
    setLoading(true);
    setData(null);
    setExpandedRow(null);
    fetch(`/api/compliance/run?fund_id=${selectedFundId}`)
      .then((r) => r.json() as Promise<{ data: RunData }>)
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  const grouped = useMemo(() => {
    if (!data) return {};
    const g: Record<string, RuleResult[]> = {};
    for (const r of data.results) {
      const cat = r.category || "Other";
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    }
    return g;
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Compliance Check</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Run 12 compliance rules against a fund&apos;s current portfolio positions.
          SQL is generated at runtime by the{" "}
          <span className="font-medium text-blue-600 dark:text-blue-400">compliance-rule-generator</span> skill via{" "}
          <span className="font-medium text-blue-600 dark:text-blue-400">text2sql</span> + Claude haiku.
        </p>
      </div>

      {/* Fund selector + Run button */}
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Fund</label>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            value={selectedFundId}
            onChange={(e) => { setSelectedFundId(e.target.value); setData(null); }}
          >
            {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <button
          onClick={runCheck}
          disabled={loading || !selectedFundId}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run Compliance Check"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-10 text-center dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Generating SQL via text2sql + running 12 compliance rules…
          </p>
          <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
            Claude haiku is generating SQL for each rule using the semantic layer
          </p>
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Summary bar */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Rules", value: data.summary.total, color: "text-zinc-900 dark:text-white" },
              { label: "Pass", value: data.summary.pass, color: "text-green-700 dark:text-green-400" },
              { label: "Fail", value: data.summary.fail, color: "text-red-700 dark:text-red-400" },
              { label: "Error", value: data.summary.error, color: "text-yellow-700 dark:text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Results grouped by category */}
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, rules]) => (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {category}
                </h2>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Rule</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-right">Limit</th>
                        <th className="px-4 py-3">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {rules.map((rule) => (
                        <RuleRow
                          key={rule.rule_id}
                          rule={rule}
                          expanded={expandedRow === rule.rule_id}
                          onToggle={() => setExpandedRow(expandedRow === rule.rule_id ? null : rule.rule_id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Python batch runner hint */}
          <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Export to Excel (Python batch runner)</p>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Generate a formatted Excel report using the standalone Python batch runner:
            </p>
            <code className="block rounded-lg bg-zinc-800 px-4 py-3 text-xs text-green-400">
              python scripts/compliance_batch_runner.py --fund-id {selectedFundId} --date 2024-01-31
            </code>
          </div>
        </>
      )}
    </div>
  );
}

// Extracted to avoid deeply nested JSX
function RuleRow({
  rule,
  expanded,
  onToggle,
}: {
  rule: RuleResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const showExpanded = expanded && (rule.breaches.length > 0 || !!rule.generated_sql);

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors hover:brightness-95 ${rowBg[rule.status] ?? ""}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{rule.rule_id}</td>
        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{rule.rule_text}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[rule.status] ?? ""}`}>
            {rule.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
          {rule.metric_value != null ? `${rule.metric_value.toFixed(2)} ${rule.unit}` : "—"}
        </td>
        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
          {`${rule.threshold} ${rule.unit}`}
        </td>
        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{rule.message}</td>
      </tr>

      {showExpanded && (
        <tr>
          <td colSpan={6} className="bg-zinc-50 px-8 py-4 dark:bg-zinc-900">
            {/* Generated SQL */}
            {rule.generated_sql && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Generated SQL — text2sql via compliance-rule-generator skill
                </p>
                <pre className="overflow-x-auto rounded-lg bg-zinc-800 px-4 py-3 text-xs leading-relaxed text-green-400 dark:bg-zinc-950">
                  {rule.generated_sql}
                </pre>
              </div>
            )}

            {/* Breach detail table */}
            {rule.breaches.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Breaching positions ({rule.breaches.length})
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-zinc-500">
                      <th className="py-1 pr-4">Identifier</th>
                      <th className="py-1 pr-4">Description</th>
                      <th className="py-1 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900">
                    {rule.breaches.map((b, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-4 font-mono text-zinc-500">{b.identifier || "—"}</td>
                        <td className="py-1 pr-4 text-zinc-700 dark:text-zinc-300">{b.description}</td>
                        <td className="py-1 text-right text-zinc-700 dark:text-zinc-300">
                          {b.value.toFixed(2)} {rule.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
