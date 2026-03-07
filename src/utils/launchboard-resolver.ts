import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import ora from 'ora';

const GITHUB_REPO = 'https://github.com/TheFahmi/omo-suites-installer.git';

export interface LaunchboardResolveResult {
  dir: string | null;
  message?: string;
}

/**
 * Resolve the Launchboard directory. Priority:
 * 1. Bundled in npm package (dev/git clone installs) — packages/launchboard relative to package root
 * 2. Persistent clone at ~/.omocs/launchboard/ (previously downloaded)
 * 3. Auto-clone from GitHub into ~/.omocs/launchboard/
 *
 * Returns { dir, message } where dir is the resolved path or null if unavailable.
 */
export function resolveLaunchboardDir(): LaunchboardResolveResult {
  // 1. Check if bundled in the npm package (dev/git clone installs)
  const bundledDir = resolve(dirname(new URL(import.meta.url).pathname), '../../packages/launchboard');
  if (existsSync(bundledDir)) {
    return { dir: bundledDir };
  }

  // 2. Check persistent location (~/.omocs/launchboard/)
  const persistentDir = resolve(homedir(), '.omocs', 'launchboard');
  if (existsSync(persistentDir)) {
    return { dir: persistentDir };
  }

  // 3. Auto-clone from GitHub
  const cloneSpinner = ora('Downloading Launchboard from GitHub...').start();
  const tmpDir = resolve(homedir(), '.omocs', '.launchboard-clone-tmp');

  try {
    // Ensure ~/.omocs/ exists
    const omocsDir = resolve(homedir(), '.omocs');
    if (!existsSync(omocsDir)) {
      mkdirSync(omocsDir, { recursive: true });
    }

    // Cleanup any leftover temp dir from a previous failed attempt
    if (existsSync(tmpDir)) {
      cleanupDir(tmpDir);
    }

    // Clone the repo (shallow, depth 1)
    execSync(`git clone ${GITHUB_REPO} --depth 1 "${tmpDir}"`, {
      stdio: 'pipe',
      timeout: 120000,
    });

    // Copy launchboard package to persistent location
    const srcDir = resolve(tmpDir, 'packages', 'launchboard');
    if (existsSync(srcDir)) {
      copyDir(srcDir, persistentDir);
      cloneSpinner.succeed('Launchboard downloaded from GitHub');

      // Cleanup temp clone
      cleanupDir(tmpDir);

      return { dir: persistentDir };
    } else {
      cloneSpinner.fail('Launchboard package not found in repository');
      cleanupDir(tmpDir);
      return { dir: null, message: 'Launchboard package not found in GitHub repository.' };
    }
  } catch (e: any) {
    cloneSpinner.fail('Failed to download Launchboard from GitHub');

    // Cleanup temp dir on failure
    try { cleanupDir(tmpDir); } catch {}

    // Check if git is available
    try {
      execSync('git --version', { stdio: 'pipe' });
    } catch {
      return { dir: null, message: 'Git is not installed. Install git and retry, or clone manually.' };
    }

    return { dir: null, message: `Failed to download Launchboard: ${e.message || 'unknown error'}` };
  }
}

/**
 * Cross-platform directory copy
 */
function copyDir(src: string, dest: string): void {
  if (process.platform === 'win32') {
    execSync(`xcopy "${src}" "${dest}" /E /I /Q`, { stdio: 'pipe' });
  } else {
    execSync(`cp -r "${src}" "${dest}"`, { stdio: 'pipe' });
  }
}

/**
 * Cross-platform directory removal
 */
function cleanupDir(dir: string): void {
  if (!existsSync(dir)) return;
  try {
    // Use Node.js built-in rmSync (available since Node 14.14)
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Fallback to platform commands
    if (process.platform === 'win32') {
      execSync(`rmdir /s /q "${dir}"`, { stdio: 'pipe' });
    } else {
      execSync(`rm -rf "${dir}"`, { stdio: 'pipe' });
    }
  }
}
