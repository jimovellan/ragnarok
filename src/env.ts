import { fileURLToPath } from "node:url";
import path from "node:path";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");

try {
    process.loadEnvFile(ENV_PATH);
} catch {
    // no .env file present, rely on already-set environment variables
}
