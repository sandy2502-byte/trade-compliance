import { db } from "@/lib/db";
import { funds, positions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Fund, Position } from "@/lib/db/schema";

function ComplianceBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Clear:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Review:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Restricted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.Clear}`}
    >
      {status}
    </span>
  );
}

type FundWithPositions = Fund & { positions: Position[] };

export default async function PortfolioPage() {
  const allFunds = await db.select().from(funds);
  const allPositions = await db.select().from(positions);

  const fundsWithPositions: FundWithPositions[] = allFunds.map((fund) => ({
    ...fund,
    positions: allPositions.filter((p) => p.fund_id === fund.id),
  }));

  const totalPositions = allPositions.length;
  const restrictedCount = allPositions.filter(
    (p) => p.compliance_status === "Restricted"
  ).length;
  const reviewCount = allPositions.filter(
    (p) => p.compliance_status === "Review"
  ).length;
  const totalAum = allFunds.reduce((sum, f) => sum + f.aum_usd, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Investment Portfolio
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fund holdings screened against sanctions lists and restricted
          jurisdictions
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total AUM", value: `$${totalAum.toFixed(1)}M` },
          { label: "Funds", value: allFunds.length },
          { label: "Positions", value: totalPositions },
          {
            label: "Flagged",
            value: `${restrictedCount} restricted · ${reviewCount} review`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Fund tables */}
      <div className="space-y-10">
        {fundsWithPositions.map((fund) => {
          const flagged = fund.positions.filter(
            (p) => p.compliance_status !== "Clear"
          ).length;
          return (
            <section key={fund.id}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {fund.name}
                </h2>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {fund.fund_type} · {fund.base_currency} · AUM $
                  {fund.aum_usd.toFixed(1)}M
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manager: {fund.manager}
                </span>
                {flagged > 0 && (
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {flagged} position{flagged !== 1 ? "s" : ""} flagged
                  </span>
                )}
              </div>

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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                    {fund.positions.map((pos) => (
                      <tr
                        key={pos.id}
                        className={
                          pos.compliance_status === "Restricted"
                            ? "bg-red-50 dark:bg-red-950/20"
                            : pos.compliance_status === "Review"
                              ? "bg-yellow-50 dark:bg-yellow-950/20"
                              : ""
                        }
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                          {pos.security_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {pos.ticker}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {pos.asset_class}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {pos.country}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {pos.sector}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                          ${(pos.market_value_usd / 1_000_000).toFixed(2)}M
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                          {pos.weight_pct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3">
                          <ComplianceBadge status={pos.compliance_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
