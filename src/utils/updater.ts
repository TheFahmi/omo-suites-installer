import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

const CACHE_DIR = resolve(homedir(), '.omocs');
const CACHE_FILE = resolve(CACHE_DIR, '.update-check');
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between checks
const PACKAGE_NAME = 'omo-suites';

interface UpdateCache {
  lastCheck: number;
  latestVersion: string | null;
}

function readCache(): UpdateCache | null {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function writeCache(cache: UpdateCache): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {}
}

function getLatestVersion(): string | null {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): number {
  const a = current.split('.').map(Number);
  const b = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) < (b[i] || 0)) return -1;
    if ((a[i] || 0) > (b[i] || 0)) return 1;
  }
  return 0;
}

function doUpdate(): boolean {
  try {
    console.log(chalk.cyan('⬆ Updating omo-suites...'));
    execSync(`npm install -g ${PACKAGE_NAME}@latest`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for updates and auto-update if a new version is available.
 * Returns true if updated (caller should re-exec), false otherwise.
 */
export async function checkAndUpdate(currentVersion: string): Promise<boolean> {
  // Skip in CI or if explicitly disabled
  if (process.env.OMOCS_NO_UPDATE === '1' || process.env.CI) {
    return false;
  }

  const cache = readCache();
  const now = Date.now();

  // Use cached version if checked recently
  let latestVersion: string | null = null;
  if (cache && (now - cache.lastCheck) < CHECK_INTERVAL_MS) {
    latestVersion = cache.latestVersion;
  } else {
    latestVersion = getLatestVersion();
    writeCache({ lastCheck: now, latestVersion });
  }

  if (!latestVersion) return false;

  if (compareVersions(currentVersion, latestVersion) < 0) {
    console.log(
      chalk.yellow(`\n⬆ New version available: ${chalk.red(currentVersion)} → ${chalk.green(latestVersion)}`)
    );

    const updated = doUpdate();
    if (updated) {
      console.log(chalk.green(`✅ Updated to v${latestVersion}. Restarting...\n`));
      // Re-exec the CLI with same args
      try {
        execSync(`${process.argv[0]} ${process.argv.slice(1).join(' ')}`, {
          stdio: 'inherit',
          env: { ...process.env, OMOCS_NO_UPDATE: '1' }, // Prevent infinite loop
        });
      } catch {}
      process.exit(0);
    } else {
      console.log(
        chalk.yellow(`⚠ Auto-update failed. Run manually: ${chalk.cyan(`npm install -g ${PACKAGE_NAME}@latest`)}\n`)
      );
    }
  }

  return false;
}
