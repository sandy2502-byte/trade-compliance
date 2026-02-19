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

type CustomRule = {
  id: number;
  rule_id: string;
  rule_text: string;
  category: string;
  threshold_override: number | null;
  enabled: boolean;
  notes: string | null;
  created_at: string;
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

const CATEGORIES = ["Asset Class", "Concentration", "Regulatory", "Liquidity", "Diversification", "Exposure", "Custom"];

const BUILTIN_RULES = [
  { id: "R001", text: "max 60% of portfolio in Equity",                        category: "Asset Class"     },
  { id: "R002", text: "no positions with Restricted compliance status",         category: "Regulatory"      },
  { id: "R003", text: "max 30% of portfolio in any single country",             category: "Concentration"   },
  { id: "R004", text: "max 30% of portfolio in any single sector",              category: "Concentration"   },
  { id: "R005", text: "max 40% of portfolio in Bonds",                          category: "Asset Class"     },
  { id: "R006", text: "min 2% of portfolio in Cash",                            category: "Liquidity"       },
  { id: "R007", text: "no single position to exceed 15% of NAV",                category: "Concentration"   },
  { id: "R008", text: "max 20% of portfolio in Review status positions",         category: "Regulatory"      },
  { id: "R009", text: "max 15% of portfolio in Commodity",                      category: "Asset Class"     },
  { id: "R010", text: "max 50% of portfolio in Equity plus ETF combined",       category: "Asset Class"     },
  { id: "R011", text: "minimum 10 positions in portfolio",                      category: "Diversification" },
  { id: "R012", text: "top 5 holdings max 80% of portfolio",                    category: "Concentration"   },
];

export default function ComplianceCheckPage() {
  const [tab, setTab] = useState<"check" | "rules">("check");

  // ── Run Check state ──────────────────────────────────────────────────
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RunData | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ── Rules Repository state ───────────────────────────────────────────
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [newRuleText, setNewRuleText] = useState("");
  const [newCategory, setNewCategory] = useState("Custom");
  const [newThreshold, setNewThreshold] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Load funds once
  useEffect(() => {
    fetch("/api/funds")
      .then((r) => r.json() as Promise<{ data: Fund[] }>)
      .then(({ data }) => {
        setFunds(data);
        if (data.length > 0) setSelectedFundId(String(data[0].id));
      })
      .catch(() => {});
  }, []);

  // Load custom rules whenever rules tab is opened
  useEffect(() => {
    if (tab !== "rules") return;
    fetch("/api/compliance/rules")
      .then((r) => r.json() as Promise<{ data: CustomRule[] }>)
      .then(({ data }) => { setCustomRules(data); setRulesLoading(false); })
      .catch(() => setRulesLoading(false));
  }, [tab]);

  function runCheck() {
    if (!selectedFundId) return;
    setLoading(true);
    setData(null);
    setExpandedRow(null);
    fetch(`/api/compliance/run?fund_id=${selectedFundId}`)
      .then((r) => r.json() as Promise<{ data: RunData }>)
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function addRule() {
    if (!newRuleText.trim()) { setFormError("Rule text is required."); return; }
    setFormError("");
    setSaving(true);
    const body: Record<string, unknown> = {
      rule_text: newRuleText.trim(),
      category: newCategory,
      notes: newNotes.trim() || null,
    };
    if (newThreshold.trim()) {
      const n = parseFloat(newThreshold);
      if (isNaN(n)) { setFormError("Threshold must be a number."); setSaving(false); return; }
      body.threshold_override = n;
    }
    fetch("/api/compliance/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json() as Promise<{ data: CustomRule }>)
      .then(({ data: newRow }) => {
        setCustomRules(prev => [...prev, newRow]);
        setNewRuleText("");
        setNewCategory("Custom");
        setNewThreshold("");
        setNewNotes("");
        setSaving(false);
      })
      .catch(() => { setFormError("Failed to save rule."); setSaving(false); });
  }

  function toggleRule(rule: CustomRule) {
    fetch(`/api/compliance/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    })
      .then((r) => r.json() as Promise<{ data: CustomRule }>)
      .then(({ data: updated }) => {
        setCustomRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      })
      .catch(() => {});
  }

  function deleteRule(rule: CustomRule) {
    if (!window.confirm(`Delete rule "${rule.rule_id}: ${rule.rule_text}"?`)) return;
    fetch(`/api/compliance/rules/${rule.id}`, { method: "DELETE" })
      .then(() => setCustomRules(prev => prev.filter(r => r.id !== rule.id)))
      .catch(() => {});
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Compliance Check</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Run compliance rules against a fund — default rules plus any custom rules you add to the repository.
          SQL is generated at runtime by the{" "}
          <span className="font-medium text-blue-600 dark:text-blue-400">compliance-rule-generator</span> skill via{" "}
          <span className="font-medium text-blue-600 dark:text-blue-400">text2sql</span> + Claude haiku.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(["check", "rules"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t === "check" ? "Run Check" : "Rules Repository"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Run Check ─────────────────────────────────────────────── */}
      {tab === "check" && (
        <>
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

          {loading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-10 text-center dark:border-blue-900 dark:bg-blue-950/20">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Generating SQL via text2sql + running compliance rules…
              </p>
              <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                Claude haiku is generating SQL for each rule using the semantic layer
              </p>
            </div>
          )}

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
        </>
      )}

      {/* ── Tab: Rules Repository ──────────────────────────────────────── */}
      {tab === "rules" && (
        <div className="space-y-8">
          {/* Add rule form */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Add New Rule</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Rule (plain English) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. max 5% of portfolio in any single ETF"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addRule(); }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Threshold override <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Notes <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IC approved Jan 2025"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}

              <button
                onClick={addRule}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "+ Add Rule"}
              </button>
            </div>
          </div>

          {/* Built-in rules */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Built-in Rules ({BUILTIN_RULES.length})
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Always active · read-only
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {BUILTIN_RULES.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{rule.id}</td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{rule.text}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{rule.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom rules */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Custom Rules ({customRules.length})
            </h2>

            {rulesLoading && (
              <p className="text-sm text-zinc-400">Loading…</p>
            )}

            {!rulesLoading && customRules.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No custom rules yet. Add your first rule above — it will run automatically in the next compliance check.
                </p>
              </div>
            )}

            {customRules.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Rule</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Threshold</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3 text-center">Enabled</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                    {customRules.map((rule) => (
                      <tr key={rule.id} className={rule.enabled ? "" : "opacity-50"}>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{rule.rule_id}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{rule.rule_text}</td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{rule.category}</td>
                        <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                          {rule.threshold_override != null ? rule.threshold_override : "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 text-xs">{rule.notes || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRule(rule)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
                            title={rule.enabled ? "Disable rule" : "Enable rule"}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteRule(rule)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete rule"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
              Custom rules are stored in the database and run alongside the 12 built-in rules on every compliance check.
              Disable a rule to skip it without deleting it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RuleRow — extracted to avoid deeply nested JSX ─────────────────────────
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
