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
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Drizzle ORM + SQLite (better-sqlite3) + Tailwind CSS 4

### Application Purpose

Trade Compliance Hub — a regulatory reference and portfolio monitoring tool for investment teams. Three main features:
1. **Portfolio** (`/portfolio`) — server-rendered fund/position table with compliance status coloring
2. **HS Lookup** (`/hs-lookup`) — client-side searchable HS code reference (hardcoded data)
3. **Trade Regulations** (`/trade-regulations`) — client-side searchable regulations filtered by type and keyword (hardcoded data)

### Directory Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (Geist fonts, Navbar)
│   ├── page.tsx                # Home dashboard
│   ├── portfolio/page.tsx      # Server Component — DB queries, compliance tables
│   ├── hs-lookup/page.tsx      # Client Component — search HS codes
│   └── trade-regulations/page.tsx  # Client Component — filter regulations
├── components/
│   └── Navbar.tsx              # Nav with active-link detection
└── lib/
    └── db/
        ├── index.ts            # SQLite connection (portfolio.db at project root)
        ├── schema.ts           # Drizzle schema: funds + positions tables
        └── seed.ts             # Seed script (4 funds, ~40 positions)
```

### Database

SQLite file: `./portfolio.db` (at project root, committed to repo).

Two tables defined in `src/lib/db/schema.ts`:
- **funds** — fund metadata (name, type, AUM, manager, status)
- **positions** — holdings linked to funds via `fund_id`; each has `compliance_status`: `"Clear"` | `"Review"` | `"Restricted"`

Path alias: `@/*` → `src/*` (configured in tsconfig.json).

### Rendering Pattern

- **Server Components** use direct Drizzle queries (no API layer exists)
- **Client Components** use `useState` + `useMemo` for search/filter on static embedded data
- No authentication, no API routes

### Adding New Features

- New DB tables: add to `src/lib/db/schema.ts`, run `npm run db:push`, update seed in `seed.ts`
- New pages: add under `src/app/[route]/page.tsx`; add nav link in `src/components/Navbar.tsx`
- HS codes and trade regulations are hardcoded in their respective page files — migrate to DB if the lists grow
