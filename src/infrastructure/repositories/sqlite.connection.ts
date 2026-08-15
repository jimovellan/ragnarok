import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../../config.js";

// Shared by the SQLite repository and its migration runner, so both always open the same file
// with the same pragmas (foreign keys are off by default in SQLite).
export function openSqliteDatabase(): DatabaseSync {
  fs.mkdirSync(path.dirname(config.sqlite.path), { recursive: true });
  const db = new DatabaseSync(config.sqlite.path);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}
