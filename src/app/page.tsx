import Link from "next/link";

const features = [
  {
    href: "/hs-lookup",
    title: "HS Code Lookup",
    description:
      "Search the Harmonized System schedule by product keyword or code prefix. View duty rates, chapter notes, and classification guidance.",
    badge: "6-digit codes",
  },
  {
    href: "/trade-regulations",
    title: "Trade Regulations",
    description:
      "Browse active import/export controls, sanctions programs, tariff agreements, and country-specific trade restrictions.",
    badge: "Updated 2024",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Trade Compliance Hub
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Reference tools for import/export classification and regulatory
          compliance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                {f.title}
              </h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {f.badge}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {f.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
