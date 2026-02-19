# Trade Compliance Hub

A portfolio compliance monitoring tool for investment teams. Run plain-English compliance rules against fund holdings — SQL is generated at runtime by Claude AI, so no hard-coded queries are needed.

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

### Portfolio Management
Browse and manage fund holdings across 4 funds and ~40 positions. Filter by fund, asset class, country, and compliance status. Add, edit, and delete positions via a modal form. Click any row to view a full position detail page.

### Compliance Check
Run 12 built-in + any number of custom compliance rules against a selected fund. Each rule is written in plain English (e.g. `max 30% of portfolio in any single country`). At runtime, Claude haiku translates each rule into SQL using a semantic layer, executes it against the portfolio database, and returns a pass/fail result with breach details and the generated SQL.

### Compliance Dashboard
Run all rules across all funds simultaneously. See a health card per fund with pass rate, failing rules, and an expandable full results table. A "Most Breached Rules" table ranks rules by how many funds are breaching them.

### Rules Repository
Add custom compliance rules in plain English. Rules are stored in the database and automatically included in every compliance check alongside the 12 built-ins. Enable/disable rules without deleting them.

---

## How the Compliance Pipeline Works

```
Plain-English rule
        ↓
classifyRule()         — local regex: extracts type, direction, threshold
        ↓
buildNLQueries()       — constructs a precise NL query describing the data needed
        ↓
text2sql()             — calls Claude haiku with semantic layer → returns SQL
        ↓
execute_sql()          — runs SQL against SQLite via better-sqlite3
        ↓
evaluate pass/fail     — compares metric value against threshold
        ↓
RuleResult             — { status, metric_value, threshold, message, breaches[] }
```

The semantic layer (`src/lib/semantic-layer.ts`) gives the LLM business-language descriptions of every table column so it generates accurate SQL without seeing raw schema names.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| AI | Anthropic Claude haiku (`claude-haiku-4-5-20251001`) |
| Python reports | pandas, openpyxl |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Install

```bash
git clone https://github.com/sandy2502-byte/trade-compliance.git
cd trade-compliance
npm install
```

### Configure

```bash
cp .env.local.example .env.local
# Edit .env.local and add your Anthropic API key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database (`portfolio.db`) is committed to the repo pre-seeded with 4 funds and ~40 positions. To re-seed:

```bash
npm run db:seed
```

---

## Project Structure

```
src/
├── app/
│   ├── portfolio/                  # Portfolio CRUD pages + API
│   ├── compliance-check/           # Run check + rules repository
│   ├── compliance-dashboard/       # Cross-fund compliance summary
│   └── api/
│       ├── funds/
│       ├── positions/
│       └── compliance/
│           ├── run/                # Single-fund rule runner
│           ├── summary/            # All-funds runner
│           └── rules/              # Custom rules CRUD
├── components/
│   ├── Navbar.tsx
│   ├── ComplianceBadge.tsx
│   └── PositionModal.tsx
└── lib/
    ├── semantic-layer.ts           # Schema description for LLM
    ├── text2sql.ts                 # NL → SQL via Claude haiku
    ├── compliance-rule-generator.ts # Core rule pipeline
    └── db/                         # Drizzle schema + connection

scripts/
└── compliance_batch_runner.py      # Export compliance results to Excel
```

---

## Built-in Compliance Rules

| ID | Rule | Category |
|---|---|---|
| R001 | max 60% of portfolio in Equity | Asset Class |
| R002 | no positions with Restricted compliance status | Regulatory |
| R003 | max 30% of portfolio in any single country | Concentration |
| R004 | max 30% of portfolio in any single sector | Concentration |
| R005 | max 40% of portfolio in Bonds | Asset Class |
| R006 | min 2% of portfolio in Cash | Liquidity |
| R007 | no single position to exceed 15% of NAV | Concentration |
| R008 | max 20% of portfolio in Review status positions | Regulatory |
| R009 | max 15% of portfolio in Commodity | Asset Class |
| R010 | max 50% of portfolio in Equity plus ETF combined | Asset Class |
| R011 | minimum 10 positions in portfolio | Diversification |
| R012 | top 5 holdings max 80% of portfolio | Concentration |

Custom rules can be added via the **Rules Repository** tab — write any plain-English rule and it will be evaluated using the same AI-powered pipeline.

---

## Excel Export (Python)

Generate a formatted compliance report as an Excel file:

```bash
pip install pandas openpyxl
python scripts/compliance_batch_runner.py --fund-id 1 --date 2024-01-31
```

Output: `compliance_results_1_20240131.xlsx` with a colour-coded Summary sheet and a Breaches sheet.
