"use client";

import { useState, useMemo } from "react";

type HsCode = {
  code: string;
  description: string;
  chapter: string;
  dutyRate: string;
  notes?: string;
};

const HS_DATA: HsCode[] = [
  { code: "010121", chapter: "Chapter 1 – Live Animals", description: "Live purebred breeding horses", dutyRate: "Free", notes: "Requires veterinary health certificate" },
  { code: "020130", chapter: "Chapter 2 – Meat", description: "Bovine meat, boneless, fresh or chilled", dutyRate: "26.4%", notes: "Subject to tariff-rate quotas under USMCA" },
  { code: "030289", chapter: "Chapter 3 – Fish", description: "Other fish, fresh or chilled, excluding fillets", dutyRate: "Free" },
  { code: "090111", chapter: "Chapter 9 – Coffee, Tea", description: "Coffee, not roasted, not decaffeinated", dutyRate: "Free" },
  { code: "100630", chapter: "Chapter 10 – Cereals", description: "Semi-milled or wholly milled rice", dutyRate: "11.2¢/kg", notes: "Section 232 tariffs may apply" },
  { code: "220421", chapter: "Chapter 22 – Beverages", description: "Wine of fresh grapes in containers ≤2L", dutyRate: "6.3¢/liter" },
  { code: "270900", chapter: "Chapter 27 – Mineral Fuels", description: "Petroleum oils, crude", dutyRate: "10.5¢/bbl" },
  { code: "300490", chapter: "Chapter 30 – Pharmaceutical", description: "Other medicaments for therapeutic use", dutyRate: "Free", notes: "May require FDA import alert clearance" },
  { code: "610910", chapter: "Chapter 61 – Apparel (Knitted)", description: "T-shirts, singlets, cotton, knitted", dutyRate: "16.5%", notes: "Country of origin rules apply" },
  { code: "620342", chapter: "Chapter 62 – Apparel (Woven)", description: "Men's trousers, bib overalls, cotton", dutyRate: "16.6%" },
  { code: "710812", chapter: "Chapter 71 – Precious Metals", description: "Gold in non-monetary form, other unwrought", dutyRate: "Free" },
  { code: "847130", chapter: "Chapter 84 – Machinery", description: "Portable digital automatic data processing machines (laptops)", dutyRate: "Free", notes: "Section 301 List 3 surtax may apply for China origin" },
  { code: "847150", chapter: "Chapter 84 – Machinery", description: "Digital processing units (desktop computers)", dutyRate: "Free" },
  { code: "851712", chapter: "Chapter 85 – Electrical Equipment", description: "Telephones for cellular networks (smartphones)", dutyRate: "Free" },
  { code: "870322", chapter: "Chapter 87 – Vehicles", description: "Passenger motor vehicles with engine 1000–1500cc", dutyRate: "2.5%", notes: "25% Section 232 tariff on certain imports" },
  { code: "870324", chapter: "Chapter 87 – Vehicles", description: "Passenger motor vehicles with engine >3000cc", dutyRate: "2.5%" },
  { code: "880240", chapter: "Chapter 88 – Aircraft", description: "Aeroplanes and aircraft >15,000kg", dutyRate: "Free", notes: "WTO Civil Aircraft Agreement applies" },
  { code: "901310", chapter: "Chapter 90 – Optical", description: "Telescopic sights; other telescopes; lasers", dutyRate: "Free", notes: "EAR export controls may apply (ECCN 6A004)" },
  { code: "940360", chapter: "Chapter 94 – Furniture", description: "Wooden furniture (bedroom, office, kitchen)", dutyRate: "Free", notes: "Lacey Act declaration required" },
  { code: "950300", chapter: "Chapter 95 – Toys", description: "Toys, scale models, and similar recreational articles", dutyRate: "Free", notes: "CPSC safety standards apply" },
];

export default function HsLookupPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HS_DATA;
    return HS_DATA.filter(
      (item) =>
        item.code.startsWith(q) ||
        item.description.toLowerCase().includes(q) ||
        item.chapter.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          HS Code Lookup
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Search by product keyword or HS code prefix. Codes are based on the
          WCO Harmonized System (6-digit).
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword or code (e.g. &quot;laptop&quot; or &quot;8471&quot;)"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-blue-900"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">HS Code</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Chapter</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">Duty Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-400 dark:text-zinc-600">
                  No codes matched your search.
                </td>
              </tr>
            ) : (
              results.map((item) => (
                <tr key={item.code} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                    {item.code}
                  </td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                    <div>{item.description}</div>
                    {item.notes && (
                      <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{item.chapter}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-800 dark:text-zinc-200">
                    {item.dutyRate}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
          Showing {results.length} of {HS_DATA.length} codes · Duty rates are indicative US MFN rates; verify with CBP
        </div>
      </div>
    </div>
  );
}
