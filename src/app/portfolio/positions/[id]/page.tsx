import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { funds, positions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ComplianceBadge from "@/components/ComplianceBadge";

type Props = { params: Promise<{ id: string }> };

export default async function PositionDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const [pos] = db.select().from(positions).where(eq(positions.id, numId)).all();
  if (!pos) notFound();

  const [fund] = db.select().from(funds).where(eq(funds.id, pos.fund_id)).all();

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/portfolio"
            className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Back to Portfolio
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {pos.security_name}
          </h1>
          <p className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            {pos.ticker}
            {pos.isin && <span className="ml-3">{pos.isin}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <ComplianceBadge status={pos.compliance_status} />
          <Link
            href={`/portfolio?edit=${pos.id}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Fund info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Fund
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd className="mt-0.5 font-medium text-zinc-900 dark:text-white">{fund?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Type</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{fund?.fund_type ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Manager</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{fund?.manager ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Classification */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Classification
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Asset Class</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{pos.asset_class}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Country</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{pos.country}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Sector</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{pos.sector}</dd>
            </div>
          </dl>
        </div>

        {/* Position sizing */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Position Sizing
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Quantity</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{pos.quantity.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Price (USD)</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">${pos.price_usd.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Market Value (USD)</dt>
              <dd className="mt-0.5 font-medium text-zinc-900 dark:text-white">
                ${(pos.market_value_usd / 1_000_000).toFixed(4)}M
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Portfolio Weight</dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{pos.weight_pct.toFixed(2)}%</dd>
            </div>
          </dl>
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Compliance
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd className="mt-1">
                <ComplianceBadge status={pos.compliance_status} />
              </dd>
            </div>
            {pos.isin && (
              <div>
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">ISIN</dt>
                <dd className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">{pos.isin}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
