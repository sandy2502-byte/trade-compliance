import Anthropic from "@anthropic-ai/sdk";
import { SEMANTIC_LAYER } from "./semantic-layer";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local and add your key."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * text2sql — converts a natural language query to a SQLite SQL statement.
 *
 * Called at "generation time" by the compliance rule generator (per the
 * compliance-rule-generator skill spec). The returned SQL is then executed
 * at runtime via execute_sql / better-sqlite3.
 *
 * @param nlQuery  Plain English description of what data is needed.
 *                 Should reference business terms from the semantic layer.
 * @returns        Clean SQLite SQL string (no markdown, no explanations).
 */
export async function text2sql(nlQuery: string): Promise<string> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `You are a SQL expert for a portfolio compliance system.
Given the database schema and semantic layer below, generate a single SQLite SQL query that answers the natural language request.

Rules:
- Return ONLY the raw SQL — no markdown, no code fences, no explanation
- Use SQLite syntax (no ILIKE, use LIKE; standard SQL functions only)
- Always include a WHERE clause filtering by the fund_id mentioned in the query
- Use exact column and table names from the schema
- For weight_pct queries, always alias the result column clearly
- Keep the query simple and correct

${SEMANTIC_LAYER}`,
    messages: [
      {
        role: "user",
        content: nlQuery,
      },
    ],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text : "";

  // Strip any markdown code fences the model might have added despite instructions
  return raw
    .replace(/^```(?:sql)?\n?/im, "")
    .replace(/\n?```$/im, "")
    .trim();
}
