import { fileURLToPath } from "node:url";
import path from "node:path";
import { runner } from "node-pg-migrate";
import { config } from "../../config.js";
import { runSqliteMigrations } from "./run-sqlite-migrations.js";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../migrations");

export async function runMigrations(): Promise<void> {
  console.log("Comprobando base de datos...");

  if (config.dbEngine === "sqlite") {
    runSqliteMigrations();
    return;
  }

  try {
    await runner({
      databaseUrl: {
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: config.postgres.database,
      },
      dir: MIGRATIONS_DIR,
      migrationsTable: "pgmigrations",
      direction: "up",
    });
  } catch (error) {
    console.error("Failed to run database migrations:", error);
    process.exit(1);
  }
}
