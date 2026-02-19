import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "portfolio.db");

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
