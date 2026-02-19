import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const funds = sqliteTable("funds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fund_type: text("fund_type").notNull(),
  base_currency: text("base_currency").notNull(),
  aum_usd: real("aum_usd").notNull(),
  inception_date: text("inception_date").notNull(),
  manager: text("manager").notNull(),
  status: text("status").notNull(),
});

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fund_id: integer("fund_id")
    .notNull()
    .references(() => funds.id),
  security_name: text("security_name").notNull(),
  ticker: text("ticker").notNull(),
  isin: text("isin"),
  asset_class: text("asset_class").notNull(),
  country: text("country").notNull(),
  sector: text("sector").notNull(),
  quantity: real("quantity").notNull(),
  price_usd: real("price_usd").notNull(),
  market_value_usd: real("market_value_usd").notNull(),
  weight_pct: real("weight_pct").notNull(),
  compliance_status: text("compliance_status").notNull(),
});

export const compliance_rules = sqliteTable("compliance_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rule_id: text("rule_id").notNull(),          // e.g. "CR001"
  rule_text: text("rule_text").notNull(),       // plain-English rule
  category: text("category").notNull().default("Custom"),
  threshold_override: real("threshold_override"), // optional numeric override
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  created_at: text("created_at").notNull(),
});

export type Fund = typeof funds.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type ComplianceRule = typeof compliance_rules.$inferSelect;
