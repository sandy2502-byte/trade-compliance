# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Build & Production
npm run build        # Production build
npm run start        # Serve production build

# Code Quality
npm run lint         # ESLint (eslint.config.mjs)

# Database
npm run db:push      # Push schema changes to SQLite (drizzle-kit push)
npm run db:seed      # Re-seed the database with test data

# Python scripts (requires pandas, openpyxl, sqlite3)
python scripts/compliance_batch_runner.py --fund-id 1 --date 2024-01-31
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Drizzle ORM + SQLite (better-sqlite3) + Tailwind CSS 4 + Anthropic SDK (`@anthropic-ai/sdk`)

**Requires:** `ANTHROPIC_API_KEY` in `.env.local` — used by `text2sql` to call Claude haiku at runtime.

### Application Purpose

Trade Compliance Hub — a regulatory reference and portfolio monitoring tool for investment teams. Six main features:

1. **Portfolio** (`/portfolio`) — interactive fund/position table with Add/Edit/Delete modal, filter/search toolbar, and a position detail page (`/portfolio/positions/[id]`)
2. **Compliance Check** (`/compliance-check`) — run 12 built-in + any custom rules against a single fund; SQL generated at runtime via `text2sql` + Claude haiku
3. **Compliance Dashboard** (`/compliance-dashboard`) — run all rules across all funds in parallel; cross-fund health cards + "Most Breached Rules" table
4. **HS Lookup** (`/hs-lookup`) — client-side searchable HS code reference (hardcoded data)
5. **Trade Regulations** (`/trade-regulations`) — client-side searchable regulations (hardcoded data)
6. **Home** (`/`) — landing page with feature links

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (Geist fonts, Navbar)
│   ├── page.tsx                            # Home landing page
│   ├── portfolio/
│   │   ├── page.tsx                        # Thin shell wrapping PositionsTable in <Suspense>
│   │   ├── PositionsTable.tsx              # Client — filter/search/CRUD table
│   │   └── positions/[id]/page.tsx         # Server — position detail view
│   ├── compliance-check/page.tsx           # Client — run check + rules repository tabs
│   ├── compliance-dashboard/page.tsx       # Client — cross-fund compliance summary
│   ├── hs-lookup/page.tsx
│   ├── trade-regulations/page.tsx
│   └── api/
│       ├── funds/route.ts                  # GET /api/funds
│       ├── positions/
│       │   ├── route.ts                    # GET (filter) + POST
│       │   └── [id]/route.ts               # GET + PUT + DELETE
│       └── compliance/
│           ├── run/route.ts                # GET /api/compliance/run?fund_id=N
│           ├── summary/route.ts            # GET /api/compliance/summary (all funds)
│           └── rules/
│               ├── route.ts               # GET + POST /api/compliance/rules
│               └── [id]/route.ts          # PATCH + DELETE
├── components/
│   ├── Navbar.tsx
│   ├── ComplianceBadge.tsx
│   └── PositionModal.tsx                  # Client — Add/Edit position modal
└── lib/
    ├── db/
    │   ├── index.ts                        # SQLite connection (portfolio.db at project root)
    │   ├── schema.ts                       # Drizzle schema: funds, positions, compliance_rules
    │   └── seed.ts
    ├── semantic-layer.ts                   # Business-language schema description for LLM context
    ├── text2sql.ts                         # NL → SQL via Claude haiku (claude-haiku-4-5-20251001)
    ├── compliance-rule-generator.ts        # Core skill: classify rule → NL query → text2sql → execute → evaluate
    └── types.ts                            # Shared ApiResponse<T> type

scripts/
├── compliance_batch_runner.py             # Python CLI — reads Excel rules, runs, writes Excel report
├── compliance_rules.xlsx                  # Sample input rules file
└── create_sample_rules.py                 # Generates the sample Excel
```

### Database

SQLite file: `./portfolio.db` (at project root, committed to repo).

Three tables in `src/lib/db/schema.ts`:
- **funds** — fund metadata (name, type, AUM, manager, status)
- **positions** — holdings linked via `fund_id`; `compliance_status`: `"Clear"` | `"Review"` | `"Restricted"`
- **compliance_rules** — user-created custom rules (rule_id `CR001`…, rule_text, category, threshold_override, enabled, notes, created_at)

Path alias: `@/*` → `src/*` (tsconfig.json).

### Compliance Rule Pipeline

The core skill pipeline in `src/lib/compliance-rule-generator.ts`:

1. `classifyRule(text)` — local regex: extracts rule type (`MAX_PCT_NAV`, `MIN_PCT_NAV`, `PROHIBITED`, `CONCENTRATION`, `MIN_COUNT`) and threshold
2. `buildNLQueries(text, ruleClass, fundId)` — builds precise natural-language queries per rule pattern
3. `text2sql(nlQuery)` — calls Claude haiku with the semantic layer as system prompt; strips markdown fences from response
4. `execute_sql(sql)` — better-sqlite3 synchronous execution
5. Evaluate pass/fail; concentration rules branch on column count (2 cols = group aggregation, 3+ cols = per-position)

**Run route** (`/api/compliance/run`): loads 12 default rules + enabled custom rules from DB, runs all in parallel via `Promise.all`.

**Summary route** (`/api/compliance/summary`): same pipeline, all funds in parallel.

### Rendering Patterns

- **Server Components**: `portfolio/positions/[id]/page.tsx` — direct Drizzle queries, no API round-trip
- **Client Components with API**: `PortfolioTable`, `compliance-check/page`, `compliance-dashboard/page` — fetch via REST API routes
- `useSearchParams()` in client components requires a `<Suspense>` wrapper in the server parent
- ESLint rule `react-hooks/set-state-in-effect` — never call `setState` synchronously in `useEffect` body; always inside `.then()` callbacks

### Adding New Features

- New DB tables: add to `src/lib/db/schema.ts`, run `npm run db:push`
- New compliance rules: either add to `DEFAULT_RULES` in `run/route.ts` + `summary/route.ts`, or add via the UI Rules Repository — custom rules are stored in `compliance_rules` table
- New rule patterns: extend `classifyRule()` and `buildNLQueries()` in `compliance-rule-generator.ts`
- HS codes and trade regulations are hardcoded in their page files — migrate to DB if the lists grow
