"use client";

import { useState, useMemo } from "react";

type Regulation = {
  id: string;
  name: string;
  type: "Sanctions" | "Tariff" | "Export Control" | "Import Restriction" | "Trade Agreement";
  countries: string[];
  status: "Active" | "Proposed" | "Sunset";
  summary: string;
  effectiveDate: string;
  authority: string;
};

const REGULATIONS: Regulation[] = [
  {
    id: "ofac-iran",
    name: "OFAC Comprehensive Iran Sanctions",
    type: "Sanctions",
    countries: ["Iran"],
    status: "Active",
    summary: "Broad prohibition on trade, investment, and financial transactions with Iran. Most goods, services, and technology are prohibited without a specific OFAC license.",
    effectiveDate: "1995-05-06",
    authority: "OFAC / 31 CFR Part 560",
  },
  {
    id: "ofac-russia",
    name: "OFAC Russia Harmful Foreign Activities Sanctions",
    type: "Sanctions",
    countries: ["Russia"],
    status: "Active",
    summary: "Expanded sanctions targeting Russian entities, blocking property of designated persons and restricting exports of technology and luxury goods following 2022 invasion of Ukraine.",
    effectiveDate: "2022-02-21",
    authority: "OFAC / EO 14024",
  },
  {
    id: "ofac-northkorea",
    name: "OFAC North Korea Sanctions",
    type: "Sanctions",
    countries: ["North Korea"],
    status: "Active",
    summary: "Comprehensive embargo covering trade in goods, services, and technology. Applies to all transactions involving the DPRK government or designated entities.",
    effectiveDate: "2008-06-26",
    authority: "OFAC / 31 CFR Part 510",
  },
  {
    id: "s301-china",
    name: "Section 301 Tariffs – China",
    type: "Tariff",
    countries: ["China"],
    status: "Active",
    summary: "Additional tariffs of 7.5%–25% (and up to 100% on EVs) on goods imported from China across four lists covering $550B in trade value. Exclusion process available.",
    effectiveDate: "2018-07-06",
    authority: "USTR / Trade Act of 1974 §301",
  },
  {
    id: "s232-steel",
    name: "Section 232 Tariffs – Steel & Aluminum",
    type: "Tariff",
    countries: ["Global (with exemptions)"],
    status: "Active",
    summary: "25% tariff on steel imports and 10% (rising to 25%) on aluminum imports on national security grounds. Quota and exemption arrangements exist for several allies.",
    effectiveDate: "2018-03-23",
    authority: "DOC / Trade Expansion Act §232",
  },
  {
    id: "usmca",
    name: "United States-Mexico-Canada Agreement (USMCA)",
    type: "Trade Agreement",
    countries: ["Mexico", "Canada"],
    status: "Active",
    summary: "Preferential zero or reduced tariff rates for qualifying goods originating in the US, Mexico, or Canada. Requires certificate of origin and regional value content compliance.",
    effectiveDate: "2020-07-01",
    authority: "USTR / 19 CFR Part 182",
  },
  {
    id: "ear-eccn",
    name: "Export Administration Regulations (EAR)",
    type: "Export Control",
    countries: ["Global"],
    status: "Active",
    summary: "Controls export, re-export, and in-country transfer of dual-use items on the Commerce Control List (CCL). License required for controlled ECCNs to restricted destinations.",
    effectiveDate: "1979-01-01",
    authority: "BIS / 15 CFR Parts 730–774",
  },
  {
    id: "itar",
    name: "International Traffic in Arms Regulations (ITAR)",
    type: "Export Control",
    countries: ["Global"],
    status: "Active",
    summary: "Controls export of defense articles and services on the US Munitions List (USML). All exports require State Department DDTC license; strict re-transfer restrictions apply.",
    effectiveDate: "1976-01-01",
    authority: "DDTC / 22 CFR Parts 120–130",
  },
  {
    id: "cbam",
    name: "EU Carbon Border Adjustment Mechanism (CBAM)",
    type: "Import Restriction",
    countries: ["European Union"],
    status: "Active",
    summary: "Carbon price on imports of iron, steel, cement, aluminum, fertilizers, electricity, and hydrogen. Transitional reporting phase 2023–2025; certificates required from 2026.",
    effectiveDate: "2023-10-01",
    authority: "European Commission / EU 2023/956",
  },
  {
    id: "eu-dsa",
    name: "Forced Labor Import Ban",
    type: "Import Restriction",
    countries: ["United States", "European Union"],
    status: "Active",
    summary: "Prohibits importation of goods made wholly or partly with forced labor, including a rebuttable-presumption rule for goods from certain Chinese regions (UFLPA).",
    effectiveDate: "2022-06-21",
    authority: "CBP / UFLPA & EU Regulation 2024/3015",
  },
  {
    id: "uk-global-tariff",
    name: "UK Global Tariff (post-Brexit)",
    type: "Tariff",
    countries: ["United Kingdom"],
    status: "Active",
    summary: "UK's independent tariff schedule in effect since January 2021. Diverges from EU in several commodity areas. UK-origin goods may benefit under Trade and Cooperation Agreement.",
    effectiveDate: "2021-01-01",
    authority: "HMRC / Taxation (Cross-border Trade) Act 2018",
  },
  {
    id: "india-pli",
    name: "India Production-Linked Incentive & Import Restrictions",
    type: "Import Restriction",
    countries: ["India"],
    status: "Active",
    summary: "India maintains restrictions on electronics, toys, and certain agricultural goods via licensing requirements and elevated basic customs duty (BCD) to promote domestic manufacturing.",
    effectiveDate: "2020-04-01",
    authority: "DGFT / Ministry of Commerce",
  },
];

const ALL_TYPES = ["All", "Sanctions", "Tariff", "Export Control", "Import Restriction", "Trade Agreement"] as const;
const STATUS_COLORS: Record<Regulation["status"], string> = {
  Active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  Proposed: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Sunset: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};
const TYPE_COLORS: Record<Regulation["type"], string> = {
  Sanctions: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  Tariff: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "Export Control": "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  "Import Restriction": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "Trade Agreement": "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
};

export default function TradeRegulationsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    return REGULATIONS.filter((r) => {
      const matchesType = typeFilter === "All" || r.type === typeFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.countries.some((c) => c.toLowerCase().includes(q)) ||
        r.summary.toLowerCase().includes(q) ||
        r.authority.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [typeFilter, query]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Trade Regulations
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Active sanctions programs, tariff measures, export controls, and
          trade agreements. Filter by type or search by country.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search by name, country, or authority…'
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-blue-900"
        />
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-blue-600 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600">
            No regulations matched your filters.
          </div>
        ) : (
          results.map((reg) => (
            <div
              key={reg.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2 flex flex-wrap items-start gap-2">
                <h2 className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">
                  {reg.name}
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[reg.type]}`}>
                  {reg.type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[reg.status]}`}>
                  {reg.status}
                </span>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {reg.summary}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
                <span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Countries: </span>
                  {reg.countries.join(", ")}
                </span>
                <span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Authority: </span>
                  {reg.authority}
                </span>
                <span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Effective: </span>
                  {new Date(reg.effectiveDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600">
        For informational purposes only. Consult legal counsel for compliance decisions.
      </p>
    </div>
  );
}
