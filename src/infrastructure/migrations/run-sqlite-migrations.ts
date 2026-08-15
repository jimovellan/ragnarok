import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openSqliteDatabase } from "../repositories/sqlite.connection.js";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../migrations-sqlite");

export function runSqliteMigrations(): void {
  const db = openSqliteDatabase();
  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      try {
        db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
      } catch (error) {
        // This runner re-execs every migration file on every startup (no applied-migrations
        // table), which is safe for the CREATE TABLE IF NOT EXISTS statements in 001_init.sql.
        // ALTER TABLE ADD COLUMN has no such guard in SQLite, so tolerate re-adding a column
        // that's already there instead of crashing on the second run.
        if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) {
          throw error;
        }
      }
    }
  } finally {
    db.close();
  }
}
