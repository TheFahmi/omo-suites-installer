import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync, copyFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { heading, success, fail, warn, info, handleError, infoBox, successBox } from '../utils/ui.ts';

// ─── Constants ───────────────────────────────────────────────────────
const OMOCS_DIR = join(homedir(), '.omocs');
const MEMORY_DIR = join(OMOCS_DIR, 'memory');
const ARCHIVE_DIR = join(MEMORY_DIR, 'archive');
const INDEX_DIR = join(OMOCS_DIR, 'workspaces');
const STATS_FILE = join(OMOCS_DIR, 'stats.json');

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function backupFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const bakPath = filePath + '.bak.' + Date.now();
  copyFileSync(filePath, bakPath);
  return bakPath;
}

function readJsonSafe(filePath: string): any {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Config Compact ─────────────────────────────────────────────────
interface ConfigIssue {
  file: string;
  type: string;
  description: string;
  fixable: boolean;
}

function scanConfigIssues(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const configLocations = [
    join(process.cwd(), 'opencode.json'),
    join(process.cwd(), '.opencode', 'opencode.json'),
    join(homedir(), '.config', 'opencode', 'opencode.json'),
  ];
  const omocLocations = [
    join(process.cwd(), 'oh-my-opencode.json'),
    join(process.cwd(), '.opencode', 'oh-my-opencode.json'),
    join(homedir(), '.config', 'opencode', 'oh-my-opencode.json'),
  ];

  // Check opencode.json files
  for (const loc of configLocations) {
    if (!existsSync(loc)) continue;
    const data = readJsonSafe(loc);
    if (!data) {
      issues.push({ file: loc, type: 'invalid-json', description: 'File is not valid JSON', fixable: false });
      continue;
    }

    // Check duplicate plugins
    if (Array.isArray(data.plugin)) {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const p of data.plugin) {
        const name = typeof p === 'string' ? p : p?.name;
        if (name && seen.has(name)) dupes.push(name);
        if (name) seen.add(name);
      }
      if (dupes.length > 0) {
        issues.push({ file: loc, type: 'duplicate-plugins', description: `Duplicate plugins: ${dupes.join(', ')}`, fixable: true });
      }
    }

    // Check empty mcpServers
    if (data.mcpServers && typeof data.mcpServers === 'object') {
      for (const [key, val] of Object.entries(data.mcpServers)) {
        if (!val || (typeof val === 'object' && Object.keys(val as object).length === 0)) {
          issues.push({ file: loc, type: 'empty-mcp', description: `Empty MCP server config: "${key}"`, fixable: true });
        }
      }
    }
  }

  // Check oh-my-opencode.json files
  for (const loc of omocLocations) {
    if (!existsSync(loc)) continue;
    const data = readJsonSafe(loc);
    if (!data) {
      issues.push({ file: loc, type: 'invalid-json', description: 'File is not valid JSON', fixable: false });
      continue;
    }

    // Check stale provider configs (empty API keys)
    if (data.providers && typeof data.providers === 'object') {
      for (const [provider, config] of Object.entries(data.providers)) {
        const cfg = config as any;
        if (cfg && cfg.apiKey === '') {
          issues.push({ file: loc, type: 'empty-api-key', description: `Empty API key for provider: "${provider}"`, fixable: true });
        }
      }
    }
  }

  return issues;
}

function fixConfigIssues(issues: ConfigIssue[]): number {
  let fixed = 0;
  const fileCache: Record<string, any> = {};

  for (const issue of issues) {
    if (!issue.fixable) continue;

    // Load file if not cached
    if (!fileCache[issue.file]) {
      const data = readJsonSafe(issue.file);
      if (!data) continue;
      fileCache[issue.file] = { data, modified: false };
    }

    const entry = fileCache[issue.file];

    if (issue.type === 'duplicate-plugins' && Array.isArray(entry.data.plugin)) {
      const seen = new Set<string>();
      entry.data.plugin = entry.data.plugin.filter((p: any) => {
        const name = typeof p === 'string' ? p : p?.name;
        if (name && seen.has(name)) return false;
        if (name) seen.add(name);
        return true;
      });
      entry.modified = true;
      fixed++;
    }

    if (issue.type === 'empty-mcp' && entry.data.mcpServers) {
      const key = issue.description.match(/"([^"]+)"/)?.[1];
      if (key && key in entry.data.mcpServers) {
        delete entry.data.mcpServers[key];
        entry.modified = true;
        fixed++;
      }
    }

    if (issue.type === 'empty-api-key' && entry.data.providers) {
      const provider = issue.description.match(/"([^"]+)"/)?.[1];
      if (provider && entry.data.providers[provider]) {
        delete entry.data.providers[provider];
        entry.modified = true;
        fixed++;
      }
    }
  }

  // Write modified files
  for (const [filePath, entry] of Object.entries(fileCache)) {
    if ((entry as any).modified) {
      backupFile(filePath);
      writeFileSync(filePath, JSON.stringify((entry as any).data, null, 2) + '\n', 'utf-8');
    }
  }

  return fixed;
}

// ─── Memory Compact ─────────────────────────────────────────────────
interface MemoryCompactResult {
  filesScanned: number;
  entriesRemoved: number;
  bytesFreed: number;
  archived: number;
}

function compactMemory(keepEntries: number, olderThanDays: number, fix: boolean): MemoryCompactResult {
  const result: MemoryCompactResult = { filesScanned: 0, entriesRemoved: 0, bytesFreed: 0, archived: 0 };

  if (!existsSync(MEMORY_DIR)) return result;

  const files = readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json') && f !== 'archive');
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  for (const file of files) {
    const filePath = join(MEMORY_DIR, file);
    const sizeBefore = statSync(filePath).size;
    result.filesScanned++;

    const data = readJsonSafe(filePath);
    if (!data || !Array.isArray(data.notes)) continue;

    const originalCount = data.notes.length;

    // Filter: keep recent + within limit
    let filtered = data.notes.filter((note: any) => {
      const noteTime = new Date(note.timestamp).getTime();
      return noteTime > cutoff;
    });

    // Keep only last N
    if (filtered.length > keepEntries) {
      filtered = filtered.slice(-keepEntries);
    }

    const removed = originalCount - filtered.length;
    if (removed === 0) continue;

    result.entriesRemoved += removed;

    if (fix) {
      // Archive removed entries
      ensureDir(ARCHIVE_DIR);
      const removedNotes = data.notes.filter((n: any) => !filtered.includes(n));
      if (removedNotes.length > 0) {
        const archivePath = join(ARCHIVE_DIR, `${basename(file, '.json')}-${Date.now()}.json`);
        writeFileSync(archivePath, JSON.stringify({ archived: new Date().toISOString(), notes: removedNotes }, null, 2), 'utf-8');
        result.archived++;
      }

      // Write trimmed file
      data.notes = filtered;
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      const sizeAfter = statSync(filePath).size;
      result.bytesFreed += sizeBefore - sizeAfter;
    } else {
      result.bytesFreed += Math.round(sizeBefore * (removed / originalCount));
    }
  }

  return result;
}

// ─── Index Compact ──────────────────────────────────────────────────
interface IndexCompactResult {
  totalIndexes: number;
  orphanedRemoved: number;
  bytesFreed: number;
}

function compactIndex(fix: boolean, rebuildAll: boolean): IndexCompactResult {
  const result: IndexCompactResult = { totalIndexes: 0, orphanedRemoved: 0, bytesFreed: 0 };

  if (!existsSync(INDEX_DIR)) return result;

  const dirs = readdirSync(INDEX_DIR).filter(d => {
    const p = join(INDEX_DIR, d);
    return statSync(p).isDirectory();
  });

  result.totalIndexes = dirs.length;

  for (const dir of dirs) {
    const indexPath = join(INDEX_DIR, dir, 'index.json');
    if (!existsSync(indexPath)) continue;

    const data = readJsonSafe(indexPath);
    if (!data) continue;

    // Check if workspace still exists
    if (data.path && !existsSync(data.path)) {
      const size = statSync(indexPath).size;
      result.orphanedRemoved++;
      result.bytesFreed += size;

      if (fix) {
        unlinkSync(indexPath);
        // Try to remove empty dir
        try {
          const remaining = readdirSync(join(INDEX_DIR, dir));
          if (remaining.length === 0) {
            unlinkSync(join(INDEX_DIR, dir));
          }
        } catch { /* ignore */ }
      }
    }
  }

  return result;
}

// ─── Stats Compact ──────────────────────────────────────────────────
interface StatsCompactResult {
  totalEntries: number;
  entriesRemoved: number;
  bytesFreed: number;
}

function compactStats(keepDays: number, fix: boolean): StatsCompactResult {
  const result: StatsCompactResult = { totalEntries: 0, entriesRemoved: 0, bytesFreed: 0 };

  if (!existsSync(STATS_FILE)) return result;

  const sizeBefore = statSync(STATS_FILE).size;
  const data = readJsonSafe(STATS_FILE);
  if (!data) return result;

  const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);

  // Handle different stats structures
  if (data.daily && typeof data.daily === 'object') {
    const dates = Object.keys(data.daily);
    result.totalEntries = dates.length;

    const toRemove = dates.filter(d => new Date(d).getTime() < cutoff);
    result.entriesRemoved = toRemove.length;

    if (fix && toRemove.length > 0) {
      // Archive
      ensureDir(join(OMOCS_DIR, 'stats-archive'));
      const archivePath = join(OMOCS_DIR, 'stats-archive', `stats-${Date.now()}.json`);
      const archived: Record<string, any> = {};
      for (const d of toRemove) {
        archived[d] = data.daily[d];
        delete data.daily[d];
      }
      writeFileSync(archivePath, JSON.stringify({ archivedAt: new Date().toISOString(), daily: archived }, null, 2), 'utf-8');

      backupFile(STATS_FILE);
      writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
      const sizeAfter = statSync(STATS_FILE).size;
      result.bytesFreed = sizeBefore - sizeAfter;
    } else {
      result.bytesFreed = Math.round(sizeBefore * (result.entriesRemoved / Math.max(result.totalEntries, 1)));
    }
  } else if (Array.isArray(data)) {
    result.totalEntries = data.length;
    const filtered = data.filter((entry: any) => {
      const ts = entry.timestamp || entry.date || entry.createdAt;
      return ts && new Date(ts).getTime() > cutoff;
    });
    result.entriesRemoved = data.length - filtered.length;

    if (fix && result.entriesRemoved > 0) {
      backupFile(STATS_FILE);
      writeFileSync(STATS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      const sizeAfter = statSync(STATS_FILE).size;
      result.bytesFreed = sizeBefore - sizeAfter;
    } else {
      result.bytesFreed = Math.round(sizeBefore * (result.entriesRemoved / Math.max(result.totalEntries, 1)));
    }
  }

  return result;
}

// ─── Command Registration ───────────────────────────────────────────
export function registerCompactCommand(program: Command): void {
  const compact = program
    .command('compact')
    .description('Clean up config, memory, indexes, and stats data');

  // compact config
  compact
    .command('config')
    .description('Scan and clean stale config entries')
    .option('--fix', 'Apply fixes (default: dry-run)')
    .action((opts) => {
      try {
        heading('Compact Config');

        const issues = scanConfigIssues();

        if (issues.length === 0) {
          successBox('No config issues found! Everything is clean.');
          return;
        }

        console.log(chalk.yellow(`\n  Found ${issues.length} issue(s):\n`));

        for (const issue of issues) {
          const fixable = issue.fixable ? chalk.green('[fixable]') : chalk.red('[manual]');
          const icon = issue.fixable ? '⚠️' : '❌';
          console.log(`  ${icon} ${fixable} ${chalk.dim(issue.file)}`);
          console.log(`     ${issue.description}\n`);
        }

        if (opts.fix) {
          const fixable = issues.filter(i => i.fixable);
          if (fixable.length === 0) {
            warn('No auto-fixable issues found.');
            return;
          }
          const fixed = fixConfigIssues(fixable);
          success(`Fixed ${fixed} issue(s). Backups created (.bak).`);
        } else {
          const fixable = issues.filter(i => i.fixable).length;
          info(`Run ${chalk.cyan('omocs compact config --fix')} to auto-fix ${fixable} issue(s).`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // compact memory
  compact
    .command('memory')
    .description('Trim old workspace memory notes')
    .option('--keep <n>', 'Keep last N entries per workspace', '50')
    .option('--older-than <days>', 'Remove entries older than N days', '30')
    .option('--fix', 'Apply cleanup (default: dry-run)')
    .action((opts) => {
      try {
        heading('Compact Memory');

        const keep = parseInt(opts.keep) || 50;
        const olderThan = parseInt(opts.olderThan) || 30;
        const result = compactMemory(keep, olderThan, !!opts.fix);

        if (result.filesScanned === 0) {
          info('No memory files found.');
          return;
        }

        console.log(`\n  ${chalk.dim('Files scanned:')}  ${result.filesScanned}`);
        console.log(`  ${chalk.dim('Entries to remove:')} ${result.entriesRemoved}`);
        console.log(`  ${chalk.dim('Space savings:')}  ~${formatBytes(result.bytesFreed)}`);

        if (result.entriesRemoved === 0) {
          successBox('Memory is already clean!');
        } else if (opts.fix) {
          success(`Removed ${result.entriesRemoved} old entries. ${result.archived} archive(s) created.`);
        } else {
          info(`Run ${chalk.cyan('omocs compact memory --fix')} to clean up.`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // compact index
  compact
    .command('index')
    .description('Clean up orphaned workspace indexes')
    .option('--all', 'Rebuild all indexes')
    .option('--fix', 'Apply cleanup (default: dry-run)')
    .action((opts) => {
      try {
        heading('Compact Index');

        const result = compactIndex(!!opts.fix, !!opts.all);

        if (result.totalIndexes === 0) {
          info('No workspace indexes found.');
          return;
        }

        console.log(`\n  ${chalk.dim('Total indexes:')}   ${result.totalIndexes}`);
        console.log(`  ${chalk.dim('Orphaned:')}        ${result.orphanedRemoved}`);
        console.log(`  ${chalk.dim('Space savings:')}   ~${formatBytes(result.bytesFreed)}`);

        if (result.orphanedRemoved === 0) {
          successBox('All indexes are valid!');
        } else if (opts.fix) {
          success(`Removed ${result.orphanedRemoved} orphaned index(es). Freed ~${formatBytes(result.bytesFreed)}.`);
        } else {
          info(`Run ${chalk.cyan('omocs compact index --fix')} to clean up.`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // compact stats
  compact
    .command('stats')
    .description('Trim old stats data')
    .option('--keep-days <n>', 'Keep last N days of stats', '30')
    .option('--fix', 'Apply cleanup (default: dry-run)')
    .action((opts) => {
      try {
        heading('Compact Stats');

        const keepDays = parseInt(opts.keepDays) || 30;
        const result = compactStats(keepDays, !!opts.fix);

        if (result.totalEntries === 0) {
          info('No stats data found.');
          return;
        }

        console.log(`\n  ${chalk.dim('Total entries:')}  ${result.totalEntries}`);
        console.log(`  ${chalk.dim('To remove:')}      ${result.entriesRemoved}`);
        console.log(`  ${chalk.dim('Space savings:')}  ~${formatBytes(result.bytesFreed)}`);

        if (result.entriesRemoved === 0) {
          successBox('Stats are already clean!');
        } else if (opts.fix) {
          success(`Removed ${result.entriesRemoved} old entries. Freed ~${formatBytes(result.bytesFreed)}. Backup + archive created.`);
        } else {
          info(`Run ${chalk.cyan('omocs compact stats --fix')} to clean up.`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // compact all
  compact
    .command('all')
    .description('Run all compact operations')
    .option('--fix', 'Apply all fixes (default: dry-run)')
    .action((opts) => {
      try {
        const fix = !!opts.fix;

        // Config
        heading('Compact Config');
        const configIssues = scanConfigIssues();
        if (configIssues.length === 0) {
          console.log(`  ✅ Config: clean`);
        } else {
          console.log(`  ⚠️  Config: ${configIssues.length} issue(s)`);
          if (fix) {
            const fixed = fixConfigIssues(configIssues.filter(i => i.fixable));
            console.log(`  ✅ Fixed ${fixed} issue(s)`);
          }
        }

        // Memory
        console.log('');
        heading('Compact Memory');
        const memResult = compactMemory(50, 30, fix);
        if (memResult.entriesRemoved === 0) {
          console.log(`  ✅ Memory: clean (${memResult.filesScanned} files)`);
        } else {
          console.log(`  ⚠️  Memory: ${memResult.entriesRemoved} old entries (~${formatBytes(memResult.bytesFreed)})`);
          if (fix) console.log(`  ✅ Cleaned & archived`);
        }

        // Index
        console.log('');
        heading('Compact Index');
        const idxResult = compactIndex(fix, false);
        if (idxResult.orphanedRemoved === 0) {
          console.log(`  ✅ Index: clean (${idxResult.totalIndexes} indexes)`);
        } else {
          console.log(`  ⚠️  Index: ${idxResult.orphanedRemoved} orphaned (~${formatBytes(idxResult.bytesFreed)})`);
          if (fix) console.log(`  ✅ Removed orphaned indexes`);
        }

        // Stats
        console.log('');
        heading('Compact Stats');
        const statsResult = compactStats(30, fix);
        if (statsResult.entriesRemoved === 0) {
          console.log(`  ✅ Stats: clean (${statsResult.totalEntries} entries)`);
        } else {
          console.log(`  ⚠️  Stats: ${statsResult.entriesRemoved} old entries (~${formatBytes(statsResult.bytesFreed)})`);
          if (fix) console.log(`  ✅ Trimmed & archived`);
        }

        // Summary
        console.log('');
        const totalIssues = configIssues.length + memResult.entriesRemoved + idxResult.orphanedRemoved + statsResult.entriesRemoved;
        if (totalIssues === 0) {
          successBox('Everything is clean! No action needed.');
        } else if (fix) {
          successBox(`Compact complete. ${totalIssues} issues resolved.`);
        } else {
          console.log(chalk.yellow(`\n  ${totalIssues} total issues found.`));
          info(`Run ${chalk.cyan('omocs compact all --fix')} to clean everything up.`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
