"use client";

import { useEffect, useState } from "react";
import type { Fund, Position } from "@/lib/db/schema";

const ASSET_CLASSES = ["Equity", "Bond", "ETF", "Commodity", "Cash"];
const COMPLIANCE_STATUSES = ["Clear", "Review", "Restricted"];

interface Props {
  position: Position | null;
  funds: Fund[];
  onClose: () => void;
  onSaved: () => void;
}

type FormData = {
  fund_id: string;
  security_name: string;
  ticker: string;
  isin: string;
  asset_class: string;
  country: string;
  sector: string;
  quantity: string;
  price_usd: string;
  market_value_usd: string;
  weight_pct: string;
  compliance_status: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

export default function PositionModal({ position, funds, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>({
    fund_id: position ? String(position.fund_id) : (funds[0]?.id ? String(funds[0].id) : ""),
    security_name: position?.security_name ?? "",
    ticker: position?.ticker ?? "",
    isin: position?.isin ?? "",
    asset_class: position?.asset_class ?? "Equity",
    country: position?.country ?? "",
    sector: position?.sector ?? "",
    quantity: position ? String(position.quantity) : "",
    price_usd: position ? String(position.price_usd) : "",
    market_value_usd: position ? String(position.market_value_usd) : "",
    weight_pct: position ? String(position.weight_pct) : "",
    compliance_status: position?.compliance_status ?? "Clear",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-compute market_value_usd from quantity × price_usd
  useEffect(() => {
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price_usd);
    if (!isNaN(qty) && !isNaN(price)) {
      setForm((prev) => ({ ...prev, market_value_usd: (qty * price).toFixed(2) }));
    }
  }, [form.quantity, form.price_usd]);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.fund_id) e.fund_id = "Fund is required";
    if (!form.security_name.trim()) e.security_name = "Security name is required";
    if (!form.ticker.trim()) e.ticker = "Ticker is required";
    if (form.isin && form.isin.length !== 12) e.isin = "ISIN must be 12 characters";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.sector.trim()) e.sector = "Sector is required";
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) e.quantity = "Quantity must be > 0";
    const price = parseFloat(form.price_usd);
    if (isNaN(price) || price < 0) e.price_usd = "Price must be ≥ 0";
    const mv = parseFloat(form.market_value_usd);
    if (isNaN(mv) || mv < 0) e.market_value_usd = "Market value must be ≥ 0";
    const weight = parseFloat(form.weight_pct);
    if (isNaN(weight) || weight < 0 || weight > 100) e.weight_pct = "Weight must be 0–100";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        fund_id: Number(form.fund_id),
        security_name: form.security_name,
        ticker: form.ticker,
        isin: form.isin || null,
        asset_class: form.asset_class,
        country: form.country,
        sector: form.sector,
        quantity: parseFloat(form.quantity),
        price_usd: parseFloat(form.price_usd),
        market_value_usd: parseFloat(form.market_value_usd),
        weight_pct: parseFloat(form.weight_pct),
        compliance_status: form.compliance_status,
      };

      const url = position ? `/api/positions/${position.id}` : "/api/positions";
      const method = position ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ security_name: (data as { error: string }).error ?? "An error occurred" });
        return;
      }

      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-zinc-950">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {position ? "Edit Position" : "Add Position"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fund */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Fund</label>
            <select className={inputClass} value={form.fund_id} onChange={(e) => set("fund_id", e.target.value)}>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {errors.fund_id && <p className="mt-1 text-xs text-red-500">{errors.fund_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Security Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Security Name</label>
              <input className={inputClass} value={form.security_name} onChange={(e) => set("security_name", e.target.value)} />
              {errors.security_name && <p className="mt-1 text-xs text-red-500">{errors.security_name}</p>}
            </div>

            {/* Ticker */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ticker</label>
              <input className={`${inputClass} font-mono`} value={form.ticker} onChange={(e) => set("ticker", e.target.value)} />
              {errors.ticker && <p className="mt-1 text-xs text-red-500">{errors.ticker}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ISIN */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">ISIN <span className="text-zinc-400">(optional)</span></label>
              <input className={`${inputClass} font-mono`} maxLength={12} value={form.isin} onChange={(e) => set("isin", e.target.value)} />
              {errors.isin && <p className="mt-1 text-xs text-red-500">{errors.isin}</p>}
            </div>

            {/* Asset Class */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Asset Class</label>
              <select className={inputClass} value={form.asset_class} onChange={(e) => set("asset_class", e.target.value)}>
                {ASSET_CLASSES.map((ac) => <option key={ac}>{ac}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Country</label>
              <input className={inputClass} value={form.country} onChange={(e) => set("country", e.target.value)} />
              {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country}</p>}
            </div>

            {/* Sector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sector</label>
              <input className={inputClass} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
              {errors.sector && <p className="mt-1 text-xs text-red-500">{errors.sector}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Quantity</label>
              <input type="number" min="0" step="any" className={inputClass} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
            </div>

            {/* Price USD */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Price (USD)</label>
              <input type="number" min="0" step="any" className={inputClass} value={form.price_usd} onChange={(e) => set("price_usd", e.target.value)} />
              {errors.price_usd && <p className="mt-1 text-xs text-red-500">{errors.price_usd}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Market Value USD */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Market Value (USD)</label>
              <input type="number" min="0" step="any" className={inputClass} value={form.market_value_usd} onChange={(e) => set("market_value_usd", e.target.value)} />
              {errors.market_value_usd && <p className="mt-1 text-xs text-red-500">{errors.market_value_usd}</p>}
            </div>

            {/* Weight % */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Weight (%)</label>
              <input type="number" min="0" max="100" step="any" className={inputClass} value={form.weight_pct} onChange={(e) => set("weight_pct", e.target.value)} />
              {errors.weight_pct && <p className="mt-1 text-xs text-red-500">{errors.weight_pct}</p>}
            </div>
          </div>

          {/* Compliance Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Compliance Status</label>
            <select className={inputClass} value={form.compliance_status} onChange={(e) => set("compliance_status", e.target.value)}>
              {COMPLIANCE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : position ? "Save Changes" : "Add Position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
