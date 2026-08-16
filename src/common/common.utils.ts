import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_JSON_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json');

async function readPackageJson(): Promise<{ name: string; version: string }> {
  const packageJson = await fs.readFile(PACKAGE_JSON_PATH, 'utf8');
  return JSON.parse(packageJson);
}

export async function getVersion(): Promise<string> {
  const packageJson = await readPackageJson();
  return packageJson.version;
}

export async function getPackageName(): Promise<string> {
  const packageJson = await readPackageJson();
  return packageJson.name;
}