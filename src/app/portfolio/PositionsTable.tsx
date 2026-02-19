"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Fund, Position } from "@/lib/db/schema";
import ComplianceBadge from "@/components/ComplianceBadge";
import PositionModal from "@/components/PositionModal";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

export default function PositionsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [positions, setPositions] = useState<Position[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  // Start as true — set to false inside .then() after first fetch
  const [loading, setLoading] = useState(true);

  const [filterFundId, setFilterFundId] = useState("");
  const [filterAssetClass, setFilterAssetClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const didCheckParams = useRef(false);

  // Build the positions URL from current filters
  const positionsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterFundId) params.set("fund_id", filterFundId);
    if (filterAssetClass) params.set("asset_class", filterAssetClass);
    if (filterStatus) params.set("compliance_status", filterStatus);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/positions?${params}`;
  }, [filterFundId, filterAssetClass, filterStatus, debouncedSearch]);

  // Fetch funds once on mount — setState only in .then()
  useEffect(() => {
    fetch("/api/funds")
      .then((r) => r.json() as Promise<{ data: Fund[] }>)
      .then(({ data }) => setFunds(data))
      .catch(() => {});
  }, []);

  // Fetch positions whenever URL (filters) changes — setState only in .then()
  useEffect(() => {
    fetch(positionsUrl)
      .then((r) => r.json() as Promise<{ data: Position[] }>)
      .then(({ data }) => {
        setPositions(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [positionsUrl]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check ?edit=id on mount to open modal pre-populated
  useEffect(() => {
    if (didCheckParams.current) return;
    didCheckParams.current = true;
    const editId = searchParams.get("edit");
    if (!editId) return;
    fetch(`/api/positions/${editId}`)
      .then((r) => r.json() as Promise<{ data: Position }>)
      .then(({ data }) => {
        if (data) {
          setEditingPosition(data);
          setShowModal(true);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const stats = useMemo(() => {
    const aum = positions.reduce((sum, p) => sum + p.market_value_usd, 0);
    const flagged = positions.filter((p) => p.compliance_status !== "Clear").length;
    return { aum, count: positions.length, flagged };
  }, [positions]);

  // Imperative refetch helper (called from event handlers, not effects)
  const refetchPositions = useCallback(() => {
    fetch(positionsUrl)
      .then((r) => r.json() as Promise<{ data: Position[] }>)
      .then(({ data }) => setPositions(data))
      .catch(() => {});
  }, [positionsUrl]);

  function openAdd() {
    setEditingPosition(null);
    setShowModal(true);
  }

  function openEdit(e: React.MouseEvent, pos: Position) {
    e.stopPropagation();
    setEditingPosition(pos);
    setShowModal(true);
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!window.confirm("Delete this position?")) return;
    fetch(`/api/positions/${id}`, { method: "DELETE" })
      .then(() => refetchPositions())
      .catch(() => {});
  }

  function handleSaved() {
    setShowModal(false);
    refetchPositions();
  }

  return (
    <>
      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Market Value", value: `$${(stats.aum / 1_000_000).toFixed(2)}M` },
          { label: "Positions", value: stats.count },
          { label: "Flagged", value: stats.flagged },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or ticker…"
          className={`${inputClass} min-w-48 flex-1`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select className={inputClass} value={filterFundId} onChange={(e) => setFilterFundId(e.target.value)}>
          <option value="">All funds</option>
          {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        <select className={inputClass} value={filterAssetClass} onChange={(e) => setFilterAssetClass(e.target.value)}>
          <option value="">All asset classes</option>
          {["Equity", "Bond", "ETF", "Commodity", "Cash"].map((ac) => (
            <option key={ac}>{ac}</option>
          ))}
        </select>

        <select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["Clear", "Review", "Restricted"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={openAdd}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Position
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Asset Class</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3 text-right">Mkt Value</th>
                <th className="px-4 py-3 text-right">Weight</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                    No positions found
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr
                    key={pos.id}
                    onClick={() => router.push(`/portfolio/positions/${pos.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                      pos.compliance_status === "Restricted"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : pos.compliance_status === "Review"
                        ? "bg-yellow-50 dark:bg-yellow-950/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{pos.security_name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{pos.ticker}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{pos.asset_class}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{pos.country}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{pos.sector}</td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      ${(pos.market_value_usd / 1_000_000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {pos.weight_pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <ComplianceBadge status={pos.compliance_status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openEdit(e, pos)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, pos.id)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PositionModal
          position={editingPosition}
          funds={funds}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
