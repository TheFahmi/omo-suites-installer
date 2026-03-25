import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { heading, success, fail, warn, info, icons, handleError, infoBox, successBox } from '../utils/ui.ts';

// ─── Types ───────────────────────────────────────────────────────────
interface MemoryNote {
  id: number;
  text: string;
  timestamp: string;
  workspace: string;
}

interface MemoryStore {
  workspace: string;
  notes: MemoryNote[];
}

// ─── Constants ───────────────────────────────────────────────────────
const MEMORY_DIR = join(homedir(), '.omocs', 'memory');
const GLOBAL_HASH = '_global';

// ─── Helpers ─────────────────────────────────────────────────────────
function getWorkspaceHash(workspacePath?: string): string {
  const cwd = workspacePath || process.cwd();
  return createHash('sha256').update(cwd).digest('hex').substring(0, 16);
}

function getMemoryPath(isGlobal: boolean): string {
  const hash = isGlobal ? GLOBAL_HASH : getWorkspaceHash();
  return join(MEMORY_DIR, `${hash}.json`);
}

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function readMemoryStore(isGlobal: boolean): MemoryStore {
  const path = getMemoryPath(isGlobal);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return { workspace: isGlobal ? 'global' : process.cwd(), notes: [] };
    }
  }
  return { workspace: isGlobal ? 'global' : process.cwd(), notes: [] };
}

function writeMemoryStore(store: MemoryStore, isGlobal: boolean): void {
  ensureMemoryDir();
  const path = getMemoryPath(isGlobal);
  writeFileSync(path, JSON.stringify(store, null, 2));
}

function getNextId(notes: MemoryNote[]): number {
  if (notes.length === 0) return 1;
  return Math.max(...notes.map(n => n.id)) + 1;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  return words.every(word => lowerText.includes(word));
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleString();
  } catch {
    return ts;
  }
}

// ─── Register Command ────────────────────────────────────────────────
export function registerMemoryCommand(program: Command): void {
  const memory = program
    .command('memory')
    .description('Workspace memory notes — persistent per-workspace notes')
    .option('-g, --global', 'Use global memory instead of workspace-scoped');

  // omocs memory add "note text"
  memory
    .command('add <text>')
    .description('Add a timestamped note to workspace memory')
    .action((text: string) => {
      try {
        const isGlobal = memory.opts().global || false;
        const store = readMemoryStore(isGlobal);
        const note: MemoryNote = {
          id: getNextId(store.notes),
          text,
          timestamp: new Date().toISOString(),
          workspace: isGlobal ? 'global' : process.cwd(),
        };
        store.notes.push(note);
        writeMemoryStore(store, isGlobal);

        const scope = isGlobal ? 'global' : 'workspace';
        success(`Note #${note.id} added to ${scope} memory`);
        console.log(`  ${chalk.gray(note.text)}`);
      } catch (error) {
        handleError(error);
      }
    });

  // omocs memory list
  memory
    .command('list')
    .description('Show all notes for current workspace (newest first)')
    .option('-n, --limit <n>', 'Limit number of notes shown')
    .action((options: { limit?: string }) => {
      try {
        const isGlobal = memory.opts().global || false;
        const store = readMemoryStore(isGlobal);
        const scope = isGlobal ? 'Global' : 'Workspace';

        heading(`📝 ${scope} Memory Notes`);

        if (store.notes.length === 0) {
          infoBox('No Notes', `No notes found in ${scope.toLowerCase()} memory.\n\nAdd one with: ${chalk.cyan(`omocs memory add "your note"`)}`);
          return;
        }

        // Sort newest first
        const sorted = [...store.notes].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const limit = options.limit ? parseInt(options.limit, 10) : sorted.length;
        const shown = sorted.slice(0, limit);

        if (!isGlobal) {
          info(`Workspace: ${chalk.gray(process.cwd())}`);
        }
        info(`Total notes: ${chalk.bold(String(store.notes.length))}`);
        console.log('');

        for (const note of shown) {
          console.log(`  ${chalk.bold.cyan(`#${note.id}`)} ${chalk.gray(formatTimestamp(note.timestamp))}`);
          console.log(`  ${note.text}`);
          console.log('');
        }

        if (limit < sorted.length) {
          info(`Showing ${limit} of ${sorted.length} notes. Use ${chalk.cyan('--limit')} to show more.`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // omocs memory search <query>
  memory
    .command('search <query>')
    .description('Fuzzy search notes in workspace memory')
    .action((query: string) => {
      try {
        const isGlobal = memory.opts().global || false;
        const store = readMemoryStore(isGlobal);
        const scope = isGlobal ? 'Global' : 'Workspace';

        heading(`🔍 Search ${scope} Memory: "${query}"`);

        const matches = store.notes.filter(n => fuzzyMatch(n.text, query));

        if (matches.length === 0) {
          warn(`No notes matching "${query}"`);
          return;
        }

        info(`Found ${chalk.bold(String(matches.length))} match(es)`);
        console.log('');

        // Sort newest first
        const sorted = [...matches].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        for (const note of sorted) {
          // Highlight matching terms
          let highlighted = note.text;
          const words = query.toLowerCase().split(/\s+/);
          for (const word of words) {
            const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlighted = highlighted.replace(regex, chalk.bold.yellow('$1'));
          }

          console.log(`  ${chalk.bold.cyan(`#${note.id}`)} ${chalk.gray(formatTimestamp(note.timestamp))}`);
          console.log(`  ${highlighted}`);
          console.log('');
        }
      } catch (error) {
        handleError(error);
      }
    });

  // omocs memory remove <id>
  memory
    .command('remove <id>')
    .description('Remove a note by ID')
    .action((idStr: string) => {
      try {
        const id = parseInt(idStr, 10);
        if (isNaN(id)) {
          fail('Invalid ID — must be a number');
          return;
        }

        const isGlobal = memory.opts().global || false;
        const store = readMemoryStore(isGlobal);
        const idx = store.notes.findIndex(n => n.id === id);

        if (idx === -1) {
          fail(`Note #${id} not found`);
          return;
        }

        const removed = store.notes.splice(idx, 1)[0];
        writeMemoryStore(store, isGlobal);

        success(`Removed note #${id}`);
        console.log(`  ${chalk.gray(removed.text)}`);
      } catch (error) {
        handleError(error);
      }
    });

  // Default action (no subcommand) — show list
  memory.action(() => {
    const isGlobal = memory.opts().global || false;
    const store = readMemoryStore(isGlobal);
    const scope = isGlobal ? 'Global' : 'Workspace';

    heading(`📝 ${scope} Memory Notes`);

    if (store.notes.length === 0) {
      infoBox('No Notes', [
        `No notes found in ${scope.toLowerCase()} memory.`,
        '',
        'Commands:',
        `  ${chalk.cyan('omocs memory add "note"')}   — add a note`,
        `  ${chalk.cyan('omocs memory list')}          — list all notes`,
        `  ${chalk.cyan('omocs memory search <q>')}    — search notes`,
        `  ${chalk.cyan('omocs memory remove <id>')}   — remove a note`,
        '',
        `Use ${chalk.cyan('--global')} for global (non-workspace) memory.`,
      ].join('\n'));
      return;
    }

    // Show brief list
    const sorted = [...store.notes].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);

    if (!isGlobal) {
      info(`Workspace: ${chalk.gray(process.cwd())}`);
    }
    info(`Total notes: ${chalk.bold(String(store.notes.length))}`);
    console.log('');

    for (const note of sorted) {
      console.log(`  ${chalk.bold.cyan(`#${note.id}`)} ${chalk.gray(formatTimestamp(note.timestamp))}`);
      console.log(`  ${note.text}`);
      console.log('');
    }

    if (store.notes.length > 10) {
      info(`Showing 10 of ${store.notes.length}. Use ${chalk.cyan('omocs memory list')} for all.`);
    }
  });
}
