import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

// ─── Constants ──────────────────────────────────────────────────────
const CACHE_DIR = resolve(homedir(), '.omocs');
const CACHE_FILE = resolve(CACHE_DIR, '.launchboard-update-check');
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PACKAGE_NAME = 'omo-suites';
const PREFIX = '[updater]';

// ─── Types ──────────────────────────────────────────────────────────
export type UpdateMode = 'git' | 'npm' | 'disabled';

export interface UpdateStatus {
  mode: UpdateMode;
  lastCheck: number | null;
  lastResult: UpdateCheckResult | null;
  checking: boolean;
}

export interface UpdateCheckResult {
  timestamp: number;
  mode: UpdateMode;
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  updated: boolean;
  error: string | null;
  message: string;
}

interface UpdateCache {
  lastCheck: number;
  mode: UpdateMode;
  result: UpdateCheckResult;
}

// ─── State ──────────────────────────────────────────────────────────
let currentStatus: UpdateStatus = {
  mode: 'disabled',
  lastCheck: null,
  lastResult: null,
  checking: false,
};

// ─── Cache ──────────────────────────────────────────────────────────
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
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error(`${PREFIX} Failed to write cache:`, err);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Run execSync with common options, returning trimmed string output */
function run(cmd: string, opts: { cwd?: string; timeout?: number } = {}): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    timeout: opts.timeout ?? 30000,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: opts.cwd,
  }).trim();
}

/** Find the git root directory (walks up from this file's location) */
function findGitRoot(): string | null {
  try {
    const startDir = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
    return run('git rev-parse --show-toplevel', { cwd: startDir, timeout: 5000 });
  } catch {
    return null;
  }
}

/** Detect whether to use git or npm mode */
export function detectMode(): UpdateMode {
  if (process.env.OMOCS_NO_UPDATE === '1' || process.env.CI) {
    return 'disabled';
  }

  const gitRoot = findGitRoot();
  if (gitRoot && existsSync(resolve(gitRoot, '.git'))) {
    return 'git';
  }

  return 'npm';
}

/** Compare semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b */
function compareVersions(current: string, latest: string): number {
  const a = current.split('.').map(Number);
  const b = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) < (b[i] || 0)) return -1;
    if ((a[i] || 0) > (b[i] || 0)) return 1;
  }
  return 0;
}

/** Read current version from package.json */
function getCurrentVersion(): string {
  try {
    const gitRoot = findGitRoot();
    const pkgPath = gitRoot
      ? resolve(gitRoot, 'package.json')
      : resolve(dirname(new URL(import.meta.url).pathname), '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ─── Git Update ─────────────────────────────────────────────────────

async function checkGitUpdate(): Promise<UpdateCheckResult> {
  const gitRoot = findGitRoot();
  if (!gitRoot) {
    return {
      timestamp: Date.now(),
      mode: 'git',
      updateAvailable: false,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      updated: false,
      error: 'Git root not found',
      message: 'Cannot find git repository',
    };
  }

  const gitOpts = { cwd: gitRoot, timeout: 30000 };

  try {
    // Fetch latest from remote
    console.log(`${PREFIX} Fetching latest from remote...`);
    run('git fetch origin main', gitOpts);

    // Compare local HEAD with remote
    const localHash = run('git rev-parse HEAD', gitOpts);
    const remoteHash = run('git rev-parse origin/main', gitOpts);

    const currentVersion = getCurrentVersion();

    if (localHash === remoteHash) {
      console.log(`${PREFIX} Already up to date (${localHash.slice(0, 7)})`);
      return {
        timestamp: Date.now(),
        mode: 'git',
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        updated: false,
        error: null,
        message: `Up to date at ${localHash.slice(0, 7)}`,
      };
    }

    // Count commits behind
    const behindCount = run('git rev-list --count HEAD..origin/main', gitOpts);

    console.log(`${PREFIX} ${behindCount} commit(s) behind remote. Updating...`);

    // Check if package.json will change
    let packageChanged = false;
    try {
      const diffOutput = run('git diff HEAD..origin/main --name-only', gitOpts);
      packageChanged = diffOutput.split('\n').some(
        (f) => f === 'package.json' || f.includes('package.json')
      );
    } catch {}

    // Pull changes
    console.log(`${PREFIX} Running git pull...`);
    run('git pull origin main', gitOpts);

    // Install deps if package.json changed
    if (packageChanged) {
      console.log(`${PREFIX} package.json changed — running install...`);
      try {
        // Try bun first (since this project uses bun), fall back to npm
        try {
          run('bun install', { cwd: gitRoot, timeout: 60000 });
        } catch {
          run('npm install', { cwd: gitRoot, timeout: 60000 });
        }
        console.log(`${PREFIX} Dependencies installed.`);
      } catch (err) {
        console.error(`${PREFIX} Failed to install dependencies:`, err);
      }
    }

    const newVersion = getCurrentVersion();
    console.log(`${PREFIX} ✅ Updated! ${localHash.slice(0, 7)} → ${remoteHash.slice(0, 7)} (v${newVersion})`);

    // Schedule restart
    scheduleRestart();

    return {
      timestamp: Date.now(),
      mode: 'git',
      updateAvailable: true,
      currentVersion,
      latestVersion: newVersion,
      updated: true,
      error: null,
      message: `Updated ${behindCount} commit(s): ${localHash.slice(0, 7)} → ${remoteHash.slice(0, 7)}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`${PREFIX} Git update check failed:`, errorMsg);
    return {
      timestamp: Date.now(),
      mode: 'git',
      updateAvailable: false,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      updated: false,
      error: errorMsg,
      message: `Git check failed: ${errorMsg}`,
    };
  }
}

// ─── npm Update ─────────────────────────────────────────────────────

async function checkNpmUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();

  try {
    // Check latest version on npm
    console.log(`${PREFIX} Checking npm registry for ${PACKAGE_NAME}...`);
    const latestVersion = run(`npm view ${PACKAGE_NAME} version`, { timeout: 15000 });

    if (!latestVersion) {
      return {
        timestamp: Date.now(),
        mode: 'npm',
        updateAvailable: false,
        currentVersion,
        latestVersion: null,
        updated: false,
        error: 'Could not determine latest version',
        message: 'npm registry returned no version',
      };
    }

    if (compareVersions(currentVersion, latestVersion) >= 0) {
      console.log(`${PREFIX} Already on latest version (v${currentVersion})`);
      return {
        timestamp: Date.now(),
        mode: 'npm',
        updateAvailable: false,
        currentVersion,
        latestVersion,
        updated: false,
        error: null,
        message: `Up to date at v${currentVersion}`,
      };
    }

    console.log(`${PREFIX} New version available: v${currentVersion} → v${latestVersion}`);
    console.log(`${PREFIX} Running npm update...`);

    try {
      run(`npm install -g ${PACKAGE_NAME}@latest`, { timeout: 60000 });
      console.log(`${PREFIX} ✅ Updated to v${latestVersion}`);

      // Schedule restart
      scheduleRestart();

      return {
        timestamp: Date.now(),
        mode: 'npm',
        updateAvailable: true,
        currentVersion,
        latestVersion,
        updated: true,
        error: null,
        message: `Updated from v${currentVersion} to v${latestVersion}`,
      };
    } catch (updateErr) {
      const errorMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      console.error(`${PREFIX} npm update failed:`, errorMsg);
      return {
        timestamp: Date.now(),
        mode: 'npm',
        updateAvailable: true,
        currentVersion,
        latestVersion,
        updated: false,
        error: errorMsg,
        message: `Update available (v${latestVersion}) but install failed: ${errorMsg}`,
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`${PREFIX} npm update check failed:`, errorMsg);
    return {
      timestamp: Date.now(),
      mode: 'npm',
      updateAvailable: false,
      currentVersion,
      latestVersion: null,
      updated: false,
      error: errorMsg,
      message: `npm check failed: ${errorMsg}`,
    };
  }
}

// ─── Restart Logic ──────────────────────────────────────────────────

function scheduleRestart(): void {
  console.log(`${PREFIX} Scheduling restart in 2 seconds...`);
  setTimeout(() => {
    console.log(`${PREFIX} Restarting process...`);
    try {
      // Spawn a new process and exit this one
      const args = process.argv.slice(1);
      const child = spawn(process.argv[0], args, {
        detached: true,
        stdio: 'inherit',
        env: { ...process.env, OMOCS_NO_UPDATE: '1' }, // Prevent update loop
      });
      child.unref();
      process.exit(0);
    } catch (err) {
      console.error(`${PREFIX} Restart failed:`, err);
      console.log(`${PREFIX} Please restart the server manually.`);
    }
  }, 2000);
}

// ─── Public API ─────────────────────────────────────────────────────

/** Check for updates. Respects cooldown unless `force` is true. */
export async function checkForUpdate(force = false): Promise<UpdateCheckResult> {
  const mode = detectMode();

  if (mode === 'disabled') {
    const result: UpdateCheckResult = {
      timestamp: Date.now(),
      mode: 'disabled',
      updateAvailable: false,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      updated: false,
      error: null,
      message: 'Updates disabled (OMOCS_NO_UPDATE=1 or CI)',
    };
    currentStatus.mode = mode;
    currentStatus.lastCheck = Date.now();
    currentStatus.lastResult = result;
    return result;
  }

  // Check cooldown
  if (!force) {
    const cache = readCache();
    if (cache && (Date.now() - cache.lastCheck) < CHECK_INTERVAL_MS) {
      console.log(`${PREFIX} Skipping check — last checked ${Math.round((Date.now() - cache.lastCheck) / 1000)}s ago (cooldown: ${CHECK_INTERVAL_MS / 1000}s)`);
      currentStatus.lastResult = cache.result;
      return cache.result;
    }
  }

  currentStatus.checking = true;
  currentStatus.mode = mode;

  console.log(`${PREFIX} Running update check (mode: ${mode})...`);

  let result: UpdateCheckResult;
  try {
    if (mode === 'git') {
      result = await checkGitUpdate();
    } else {
      result = await checkNpmUpdate();
    }
  } catch (err) {
    result = {
      timestamp: Date.now(),
      mode,
      updateAvailable: false,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      updated: false,
      error: err instanceof Error ? err.message : String(err),
      message: `Update check failed unexpectedly: ${err}`,
    };
  }

  currentStatus.lastCheck = Date.now();
  currentStatus.lastResult = result;
  currentStatus.checking = false;

  // Cache the result
  writeCache({
    lastCheck: Date.now(),
    mode,
    result,
  });

  return result;
}

/** Get current update status (non-blocking). */
export function getUpdateStatus(): UpdateStatus {
  // If we haven't checked yet, try to load from cache
  if (!currentStatus.lastResult) {
    const cache = readCache();
    if (cache) {
      currentStatus.lastCheck = cache.lastCheck;
      currentStatus.lastResult = cache.result;
      currentStatus.mode = cache.mode;
    } else {
      currentStatus.mode = detectMode();
    }
  }
  return { ...currentStatus };
}

/** Run update check on startup (non-blocking). */
export function startupUpdateCheck(): void {
  const mode = detectMode();
  console.log(`${PREFIX} Startup update check (mode: ${mode})`);

  if (mode === 'disabled') {
    console.log(`${PREFIX} Updates disabled — skipping startup check`);
    currentStatus.mode = 'disabled';
    return;
  }

  currentStatus.mode = mode;

  // Run asynchronously — don't block server startup
  checkForUpdate().catch((err) => {
    console.error(`${PREFIX} Startup update check failed (non-fatal):`, err);
  });
}
