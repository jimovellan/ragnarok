import os from "node:os";
import path from "node:path";

export const CONFIG_DIR = path.join(process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config"), "ragnarok");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config");

try {
    process.loadEnvFile(CONFIG_PATH);
} catch {
    // no config file present yet, rely on already-set environment variables
}
