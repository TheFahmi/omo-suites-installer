import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────
const OMOCS_DIR = join(homedir(), '.omocs');
const AUTO_STATE_FILE = join(OMOCS_DIR, 'auto-state.json');
const INDEX_DIR = join(OMOCS_DIR, 'workspaces');
const MEMORY_DIR = join(OMOCS_DIR, 'memory');
const STATS_FILE = join(OMOCS_DIR, 'stats.json');
const TEMPLATE_DIR = join(OMOCS_DIR, 'templates');
const COMPACT_THRESHOLD_DAYS = 7;
const COMPACT_MEMORY_MAX_ENTRIES = 100;
const COMPACT_STATS_MAX_DAYS = 60;
const INDEX_STALE_HOURS = 24;

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage', '.opencode', '.venv', 'vendor'];
const WATCHED_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.vue', '.svelte'];

// ─── Types ───────────────────────────────────────────────────────────
interface AutoState {
  lastCompact: number;
  lastIndex: Record<string, number>; // workspaceHash -> timestamp
  lastDoctor: number;
  structureHashes: Record<string, string>; // workspaceHash -> structure hash
  suppressedWarnings: string[];
}

interface AutoResult {
  action: string;
  status: 'ok' | 'warn' | 'fixed';
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJsonSafe(path: string): any {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function getAutoState(): AutoState {
  if (existsSync(AUTO_STATE_FILE)) {
    const state = readJsonSafe(AUTO_STATE_FILE);
    if (state) return state;
  }
  return {
    lastCompact: 0,
    lastIndex: {},
    lastDoctor: 0,
    structureHashes: {},
    suppressedWarnings: [],
  };
}

function saveAutoState(state: AutoState): void {
  ensureDir(OMOCS_DIR);
  writeFileSync(AUTO_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function getWorkspaceHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').substring(0, 16);
}

function getStructureHash(cwd: string): string {
  try {
    const entries: string[] = [];
    const scan = (dir: string, depth: number) => {
      if (depth > 2) return;
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || IGNORED_DIRS.includes(item.name)) continue;
        if (item.isDirectory()) {
          entries.push(`d:${item.name}`);
          scan(join(dir, item.name), depth + 1);
        } else if (item.isFile() && WATCHED_EXTS.includes(extname(item.name))) {
          entries.push(`f:${item.name}`);
        }
      }
    };
    scan(cwd, 0);
    return createHash('sha256').update(entries.join('|')).digest('hex').substring(0, 16);
  } catch { return ''; }
}

// ─── Auto-Compact ────────────────────────────────────────────────────
function autoCompact(state: AutoState): AutoResult[] {
  const results: AutoResult[] = [];
  const now = Date.now();

  // Only run every COMPACT_THRESHOLD_DAYS
  if (now - state.lastCompact < COMPACT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
    return results;
  }

  // Check memory size
  if (existsSync(MEMORY_DIR)) {
    try {
      const files = readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json'));
      let totalEntries = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = join(MEMORY_DIR, file);
        totalSize += statSync(filePath).size;
        const data = readJsonSafe(filePath);
        if (data && Array.isArray(data.notes)) totalEntries += data.notes.length;
      }

      if (totalEntries > COMPACT_MEMORY_MAX_ENTRIES) {
        // Auto-trim: keep last COMPACT_MEMORY_MAX_ENTRIES entries per file
        for (const file of files) {
          const filePath = join(MEMORY_DIR, file);
          const data = readJsonSafe(filePath);
          if (data && Array.isArray(data.notes) && data.notes.length > COMPACT_MEMORY_MAX_ENTRIES) {
            // Archive old entries
            const archiveDir = join(MEMORY_DIR, 'archive');
            ensureDir(archiveDir);
            const removed = data.notes.splice(0, data.notes.length - COMPACT_MEMORY_MAX_ENTRIES);
            writeFileSync(join(archiveDir, `${basename(file, '.json')}-auto-${now}.json`),
              JSON.stringify({ archived: new Date().toISOString(), notes: removed }, null, 2), 'utf-8');
            writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
          }
        }
        results.push({ action: 'auto-compact-memory', status: 'fixed', message: `Trimmed memory (${totalEntries} entries → ${COMPACT_MEMORY_MAX_ENTRIES} max per file)` });
      } else {
        results.push({ action: 'auto-compact-memory', status: 'ok', message: `Memory clean (${totalEntries} entries)` });
      }
    } catch { /* skip */ }
  }

  // Check stats age
  if (existsSync(STATS_FILE)) {
    try {
      const data = readJsonSafe(STATS_FILE);
      if (data && data.daily) {
        const cutoff = now - (COMPACT_STATS_MAX_DAYS * 24 * 60 * 60 * 1000);
        const dates = Object.keys(data.daily);
        const old = dates.filter(d => new Date(d).getTime() < cutoff);

        if (old.length > 0) {
          const archiveDir = join(OMOCS_DIR, 'stats-archive');
          ensureDir(archiveDir);
          const archived: Record<string, any> = {};
          for (const d of old) { archived[d] = data.daily[d]; delete data.daily[d]; }
          writeFileSync(join(archiveDir, `stats-auto-${now}.json`),
            JSON.stringify({ archivedAt: new Date().toISOString(), daily: archived }, null, 2), 'utf-8');
          writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
          results.push({ action: 'auto-compact-stats', status: 'fixed', message: `Archived ${old.length} old stats entries` });
        }
      }
    } catch { /* skip */ }
  }

  // Check orphaned indexes
  if (existsSync(INDEX_DIR)) {
    try {
      const dirs = readdirSync(INDEX_DIR).filter(d => {
        const p = join(INDEX_DIR, d);
        return statSync(p).isDirectory();
      });

      let orphaned = 0;
      for (const dir of dirs) {
        const indexPath = join(INDEX_DIR, dir, 'index.json');
        if (!existsSync(indexPath)) continue;
        const data = readJsonSafe(indexPath);
        if (data && data.path && !existsSync(data.path)) {
          const { unlinkSync } = require('fs');
          unlinkSync(indexPath);
          orphaned++;
        }
      }

      if (orphaned > 0) {
        results.push({ action: 'auto-compact-index', status: 'fixed', message: `Removed ${orphaned} orphaned index(es)` });
      }
    } catch { /* skip */ }
  }

  state.lastCompact = now;
  return results;
}

// ─── Auto-Index ──────────────────────────────────────────────────────
function autoIndex(cwd: string, state: AutoState): AutoResult[] {
  const results: AutoResult[] = [];
  const wsHash = getWorkspaceHash(cwd);
  const now = Date.now();

  // Check if index is stale
  const lastIndexTime = state.lastIndex[wsHash] || 0;
  if (now - lastIndexTime < INDEX_STALE_HOURS * 60 * 60 * 1000) {
    return results; // Not stale yet
  }

  // Check if structure changed
  const currentHash = getStructureHash(cwd);
  const lastHash = state.structureHashes[wsHash] || '';

  if (currentHash && currentHash !== lastHash) {
    // Rebuild index
    try {
      const indexDir = join(INDEX_DIR, wsHash);
      ensureDir(indexDir);

      const techStack: string[] = [];
      const keyFiles: string[] = [];
      let fileCount = 0;

      // Quick scan
      const scan = (dir: string, depth: number) => {
        if (depth > 3) return;
        try {
          const items = readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.name.startsWith('.') || IGNORED_DIRS.includes(item.name)) continue;
            if (item.isDirectory()) scan(join(dir, item.name), depth + 1);
            else if (item.isFile()) {
              fileCount++;
              const ext = extname(item.name);
              if (ext === '.ts' || ext === '.tsx') { if (!techStack.includes('TypeScript')) techStack.push('TypeScript'); }
              if (ext === '.py') { if (!techStack.includes('Python')) techStack.push('Python'); }
              if (ext === '.go') { if (!techStack.includes('Go')) techStack.push('Go'); }
              if (ext === '.rs') { if (!techStack.includes('Rust')) techStack.push('Rust'); }

              // Key files
              if (['package.json', 'tsconfig.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
                   'Dockerfile', 'docker-compose.yml', 'next.config.ts', 'next.config.js',
                   'nest-cli.json', 'opencode.json', 'AGENTS.md'].includes(item.name)) {
                keyFiles.push(join(dir, item.name));
              }
            }
          }
        } catch { /* skip */ }
      };

      scan(cwd, 0);

      const index = {
        id: wsHash,
        path: cwd,
        builtAt: new Date().toISOString(),
        techStack,
        fileCount,
        keyFiles: keyFiles.map(f => f.replace(cwd, '.')),
        autoBuilt: true,
      };

      writeFileSync(join(indexDir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

      state.lastIndex[wsHash] = now;
      state.structureHashes[wsHash] = currentHash;

      results.push({ action: 'auto-index', status: 'fixed', message: `Index rebuilt (${fileCount} files, ${techStack.join('/')})` });
    } catch { /* skip */ }
  }

  return results;
}

// ─── Auto-Doctor ─────────────────────────────────────────────────────
function autoDoctor(cwd: string, state: AutoState): AutoResult[] {
  const results: AutoResult[] = [];

  // Only run once per day
  const now = Date.now();
  if (now - state.lastDoctor < 24 * 60 * 60 * 1000) return results;

  const warnings: string[] = [];

  // Check config exists
  const configLocations = ['opencode.json', join('.opencode', 'opencode.json')];
  const hasConfig = configLocations.some(l => existsSync(join(cwd, l)));
  if (!hasConfig) {
    warnings.push('No opencode.json found — run `omocs init` to set up');
  }

  // Check AGENTS.md exists
  if (!existsSync(join(cwd, 'AGENTS.md'))) {
    warnings.push('No AGENTS.md — run `omocs watch generate` or `omocs init-deep`');
  }

  // Check .gitignore has .opencode
  const gitignorePath = join(cwd, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.opencode')) {
      warnings.push('.opencode not in .gitignore — sessions/cache may be committed');
    }
  }

  // Check omocs data dir size
  if (existsSync(OMOCS_DIR)) {
    try {
      let totalSize = 0;
      const checkSize = (dir: string) => {
        const items = readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const p = join(dir, item.name);
          if (item.isFile()) totalSize += statSync(p).size;
          else if (item.isDirectory()) checkSize(p);
        }
      };
      checkSize(OMOCS_DIR);

      if (totalSize > 50 * 1024 * 1024) { // > 50MB
        warnings.push(`~/.omocs is ${(totalSize / 1024 / 1024).toFixed(0)}MB — run \`omocs compact all --fix\``);
      }
    } catch { /* skip */ }
  }

  // Filter out suppressed warnings
  const unsuppressed = warnings.filter(w => !state.suppressedWarnings.includes(w));

  if (unsuppressed.length > 0) {
    results.push({
      action: 'auto-doctor',
      status: 'warn',
      message: unsuppressed.join('; '),
    });
  } else {
    results.push({ action: 'auto-doctor', status: 'ok', message: 'Workspace healthy' });
  }

  state.lastDoctor = now;
  return results;
}

// ─── Auto-Template Suggest ───────────────────────────────────────────
function autoTemplateSuggest(cwd: string, state: AutoState): AutoResult[] {
  const results: AutoResult[] = [];

  // Only suggest if no config exists
  const configLocations = ['opencode.json', join('.opencode', 'opencode.json')];
  const hasConfig = configLocations.some(l => existsSync(join(cwd, l)));
  if (hasConfig) return results;

  // Check if we have matching templates
  if (!existsSync(TEMPLATE_DIR)) return results;

  try {
    const templates = readdirSync(TEMPLATE_DIR).filter(d => {
      const manifestPath = join(TEMPLATE_DIR, d, 'manifest.json');
      return existsSync(manifestPath);
    });

    if (templates.length > 0) {
      // Detect project type
      let projectType = 'unknown';
      if (existsSync(join(cwd, 'package.json'))) {
        const pkg = readJsonSafe(join(cwd, 'package.json'));
        if (pkg) {
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['next']) projectType = 'nextjs';
          else if (deps['@nestjs/core']) projectType = 'nestjs';
          else if (deps['react']) projectType = 'react';
          else if (deps['vue']) projectType = 'vue';
          else projectType = 'node';
        }
      } else if (existsSync(join(cwd, 'Cargo.toml'))) projectType = 'rust';
      else if (existsSync(join(cwd, 'go.mod'))) projectType = 'go';
      else if (existsSync(join(cwd, 'pyproject.toml'))) projectType = 'python';

      // Match templates by tags
      for (const t of templates) {
        const manifest = readJsonSafe(join(TEMPLATE_DIR, t, 'manifest.json'));
        if (manifest && manifest.tags) {
          const tags = manifest.tags as string[];
          if (tags.includes(projectType) || tags.includes('fullstack')) {
            results.push({
              action: 'auto-template',
              status: 'warn',
              message: `Template "${manifest.name}" matches this ${projectType} project → omocs template load ${manifest.name}`,
            });
            break; // Only suggest one
          }
        }
      }
    }
  } catch { /* skip */ }

  return results;
}

// ─── Main Auto Runner ────────────────────────────────────────────────
export async function runAutoChecks(cwd: string, opts?: { silent?: boolean; skipCompact?: boolean }): Promise<AutoResult[]> {
  const state = getAutoState();
  const allResults: AutoResult[] = [];

  // 1. Auto-Doctor (always)
  allResults.push(...autoDoctor(cwd, state));

  // 2. Auto-Index (on structure change)
  allResults.push(...autoIndex(cwd, state));

  // 3. Auto-Compact (periodic)
  if (!opts?.skipCompact) {
    allResults.push(...autoCompact(state));
  }

  // 4. Auto-Template suggest (new projects)
  allResults.push(...autoTemplateSuggest(cwd, state));

  // Save state
  saveAutoState(state);

  // Print results unless silent
  if (!opts?.silent) {
    const warnings = allResults.filter(r => r.status === 'warn');
    const fixes = allResults.filter(r => r.status === 'fixed');

    if (warnings.length > 0 || fixes.length > 0) {
      console.log(chalk.dim('  ── omocs auto ──'));
      for (const r of fixes) {
        console.log(`  ${chalk.green('⚡')} ${chalk.dim(r.message)}`);
      }
      for (const r of warnings) {
        console.log(`  ${chalk.yellow('⚠')}  ${chalk.dim(r.message)}`);
      }
      console.log('');
    }
  }

  return allResults;
}

// ─── Suppress Warning ────────────────────────────────────────────────
export function suppressWarning(warning: string): void {
  const state = getAutoState();
  if (!state.suppressedWarnings.includes(warning)) {
    state.suppressedWarnings.push(warning);
    saveAutoState(state);
  }
}

// ─── Reset Auto State ────────────────────────────────────────────────
export function resetAutoState(): void {
  const state: AutoState = {
    lastCompact: 0,
    lastIndex: {},
    lastDoctor: 0,
    structureHashes: {},
    suppressedWarnings: [],
  };
  saveAutoState(state);
}
