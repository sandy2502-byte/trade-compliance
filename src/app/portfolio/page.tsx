import { Suspense } from "react";
import PositionsTable from "./PositionsTable";

export default function PortfolioPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Investment Portfolio
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fund holdings screened against sanctions lists and restricted
          jurisdictions
        </p>
      </div>
      <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}>
        <PositionsTable />
      </Suspense>
    </div>
  );
}
