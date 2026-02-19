/**
 * Semantic Layer — portfolio.db
 *
 * Provides a business-language description of the schema for use by text2sql.
 * Maps compliance/investment terminology to actual table/column names and values.
 */
export const SEMANTIC_LAYER = `
# Portfolio Database — Semantic Layer

## Tables

### funds
Stores metadata about each investment fund.

Columns:
- id         (integer, PK)  — unique fund identifier; used in WHERE fund_id = X
- name       (text)         — full fund name, e.g. "Alpha Growth Fund"
- fund_type  (text)         — fund strategy type; values: "Equity", "Fixed Income", "Multi-Asset", "Alternatives"
- base_currency (text)      — base currency, e.g. "USD", "GBP", "EUR"
- aum_usd    (real)         — Assets Under Management in USD **millions**. Treat this as the fund NAV.
                              To get NAV in USD: aum_usd * 1000000
- inception_date (text)     — fund launch date in YYYY-MM-DD format
- manager    (text)         — fund manager name
- status     (text)         — fund status; values: "Active", "Closed"

### positions
Stores individual security holdings within each fund.

Columns:
- id               (integer, PK)  — unique position identifier
- fund_id          (integer, FK→funds.id) — which fund owns this position
- security_name    (text)         — full security name, e.g. "Apple Inc", "US Treasury 2030"
- ticker           (text)         — exchange ticker, e.g. "AAPL", "MSFT"
- isin             (text, nullable) — 12-char ISIN code; may be NULL
- asset_class      (text)         — asset class; **exact values**: "Equity", "Bond", "ETF", "Commodity", "Cash"
                                    Equity = stocks/shares
                                    Bond   = fixed income, government/corporate debt
                                    ETF    = exchange-traded funds (equity-like)
                                    Commodity = commodity instruments
                                    Cash   = cash deposits, money market instruments
- country          (text)         — country of domicile or primary listing, e.g. "USA", "UK", "Germany"
- sector           (text)         — business sector, e.g. "Technology", "Healthcare", "Financials",
                                    "Energy", "Consumer Discretionary", "Utilities", "Materials"
- quantity         (real)         — number of shares/units held
- price_usd        (real)         — current price per unit in USD
- market_value_usd (real)         — total market value in USD = quantity × price_usd
- weight_pct       (real)         — position weight as % of fund total portfolio (0–100 scale).
                                    Already computed. SUM(weight_pct) for a fund ≈ 100.
                                    Use this for "% of NAV" or "% of portfolio" calculations.
- compliance_status (text)        — compliance flag; **exact values**: "Clear", "Review", "Restricted"
                                    Clear      = no issues
                                    Review     = under compliance review
                                    Restricted = compliance breach, holding restricted

## Key Business Mappings

| Business term              | SQL equivalent |
|----------------------------|----------------|
| NAV / fund NAV             | funds.aum_usd * 1000000 (join to funds) |
| % of NAV / portfolio weight| positions.weight_pct (already %) |
| total equity exposure      | SUM(weight_pct) WHERE asset_class = 'Equity' |
| total bond/fixed income    | SUM(weight_pct) WHERE asset_class = 'Bond' |
| ETF exposure               | SUM(weight_pct) WHERE asset_class = 'ETF' |
| cash / cash equivalents    | SUM(weight_pct) WHERE asset_class = 'Cash' |
| commodity exposure         | SUM(weight_pct) WHERE asset_class = 'Commodity' |
| equity-like combined       | SUM(weight_pct) WHERE asset_class IN ('Equity','ETF') |
| restricted positions       | WHERE compliance_status = 'Restricted' |
| positions under review     | WHERE compliance_status = 'Review' |
| clear positions            | WHERE compliance_status = 'Clear' |
| single-issuer concentration| GROUP BY security_name or ticker |
| country concentration      | GROUP BY country |
| sector concentration       | GROUP BY sector |
| position identifier        | isin (preferred), ticker as fallback |

## Important Notes

1. **No date dimension** — positions table has no date column. All data is a current snapshot.
   If a query mentions "as of date" or a date, ignore the date filter.
2. **weight_pct is already calculated** — do NOT try to compute market_value_usd / aum_usd yourself.
   Use weight_pct directly for "% of NAV" rules.
3. **Fund filter** — always include WHERE fund_id = <fund_id> in position queries.
4. **NULL handling** — isin can be NULL. Use COALESCE(isin, ticker) for identifiers.
5. **Database dialect** — SQLite. Use SQLite-compatible syntax (no ILIKE, no LIMIT OFFSET shorthand issues).
`;
