#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");
try {
  process.loadEnvFile(ENV_PATH);
} catch {
  // no .env file present, rely on already-set environment variables
}

const { config } = await import("../dist/config.js");
const { PostgresKnowledgeRepository } = await import(
  "../dist/infrastructure/repositories/postgres.knowledge.repository.js"
);
const { LocalTransformersEmbeddingService } = await import(
  "../dist/infrastructure/services/embedings/local-transformers.embedding.service.js"
);
const { UpdateKnowledgeCommand } = await import("../dist/application/knowledge/commands/update-knowledge.command.js");

const repository = new PostgresKnowledgeRepository(new LocalTransformersEmbeddingService());
const updateCommand = new UpdateKnowledgeCommand(repository);

const pool = new pg.Pool(config.postgres);
const { rows } = await pool.query("SELECT key, title, summary, content FROM knowledge ORDER BY id");
await pool.end();

console.log(`Reembebiendo ${rows.length} entradas con el motor de embeddings activo...`);
for (const [index, row] of rows.entries()) {
  // Pass the current values back unchanged — this still forces updateByKey to regenerate
  // the embedding (it triggers whenever title/summary/content are present in the changes).
  await updateCommand.execute(row.key, { title: row.title, summary: row.summary, content: row.content });
  console.log(`${index + 1}/${rows.length} -> ${row.title}`);
}
console.log("Listo.");
process.exit(0);
