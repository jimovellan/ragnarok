import { getPackageName, getVersion } from '../../common/common.utils.js';

const REGISTRY_TIMEOUT_MS = 2000;

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Fetches the latest published version from the npm registry, or null if unreachable. */
export async function getLatestVersion(): Promise<string | null> {
  const packageName = await getPackageName();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS);
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface UpdateStatus {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const current = await getVersion();
  const latest = await getLatestVersion();
  return {
    current,
    latest,
    updateAvailable: latest !== null && compareVersions(latest, current) > 0,
  };
}

/** Fire-and-forget: prints a notice if a newer version is available. Never blocks or throws. */
export function notifyIfUpdateAvailable(): void {
  checkForUpdate()
    .then(({ current, latest, updateAvailable }) => {
      if (updateAvailable && latest) {
        console.log(`\nAviso: hay una nueva versión disponible (${latest}, tienes ${current}). Ejecuta "ragnarok update" para actualizar.\n`);
      }
    })
    .catch(() => undefined);
}
