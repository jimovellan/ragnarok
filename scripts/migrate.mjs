#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");

try {
  process.loadEnvFile(ENV_PATH);
} catch {
  // no .env file present, rely on already-set environment variables
}

const host = process.env["POSTGRES_HOST"] ?? "192.168.1.42";
const port = process.env["POSTGRES_PORT"] ?? "5432";
const user = process.env["POSTGRES_USER"] ?? "Jim";
const password = process.env["POSTGRES_PASSWORD"] ?? "";
const database = process.env["POSTGRES_DB"] ?? "docs";

const databaseUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const result = spawnSync("node_modules/.bin/node-pg-migrate", process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
