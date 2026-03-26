import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, readdirSync, statSync, readlinkSync } from 'fs';
import { join, basename, relative } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { heading, success, fail, warn, info, icons, handleError, infoBox, label, divider } from '../utils/ui.ts';

// ─── Types ───────────────────────────────────────────────────────────
interface SessionInfo {
  id: string;
  path: string;
  lastModified: Date;
  size: number;
  messageCount: number;
  model?: string;
  workspace?: string;
  status: 'idle' | 'active' | 'unknown';
}

// ─── Constants ───────────────────────────────────────────────────────
const OPENCODE_DIR = join(homedir(), '.opencode');
const SESSION_DIR = join(OPENCODE_DIR, 'sessions');

// ─── Helpers ─────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function parseSessionFile(filePath: string): SessionInfo | null {
  try {
    const stat = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    let model: string | undefined;
    let workspace: string | undefined;
    let messageCount = 0;

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.role === 'assistant' || msg.role === 'user') messageCount++;
        if (msg.model && !model) model = msg.model;
        if (msg.cwd && !workspace) workspace = msg.cwd;
      } catch { /* skip non-JSON lines */ }
    }

    const id = basename(filePath).replace(/\.\w+$/, '');
    const isActive = (Date.now() - stat.mtimeMs) < 5 * 60 * 1000;

    return {
      id,
      path: filePath,
      lastModified: new Date(stat.mtimeMs),
      size: stat.size,
      messageCount,
      model,
      workspace,
      status: isActive ? 'active' : 'idle',
    };
  } catch {
    return null;
  }
}

function findSessions(): SessionInfo[] {
  const sessions: SessionInfo[] = [];

  // Check standard OpenCode session dirs
  const searchDirs = [SESSION_DIR];

  // Also check .opencode in current workspace
  const localSessionDir = join(process.cwd(), '.opencode', 'sessions');
  if (existsSync(localSessionDir)) searchDirs.push(localSessionDir);

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));
      for (const file of files) {
        const session = parseSessionFile(join(dir, file));
        if (session) sessions.push(session);
      }
    } catch { /* skip unreadable dirs */ }
  }

  return sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

function getSessionMessages(session: SessionInfo, limit?: number): any[] {
  try {
    const content = readFileSync(session.path, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    const messages: any[] = [];
    for (const line of lines) {
      try { messages.push(JSON.parse(line)); } catch { /* skip */ }
    }
    if (limit) return messages.slice(-limit);
    return messages;
  } catch { return []; }
}

// ─── Register Command ────────────────────────────────────────────────
export function registerSessionCommand(program: Command): void {
  const session = program
    .command('session')
    .description('Browse, search, and manage OpenCode sessions');

  // session list
  session
    .command('list')
    .description('List all OpenCode sessions')
    .option('-n, --limit <n>', 'Show last N sessions', '20')
    .option('--active', 'Show only active sessions')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      try {
        heading('📋 OpenCode Sessions');

        const sessions = findSessions();

        if (sessions.length === 0) {
          infoBox('No Sessions', `No OpenCode sessions found.\n\nSession dir: ${chalk.gray(SESSION_DIR)}`);
          return;
        }

        let filtered = opts.active ? sessions.filter(s => s.status === 'active') : sessions;
        const limit = parseInt(opts.limit) || 20;
        const shown = filtered.slice(0, limit);

        if (opts.json) {
          console.log(JSON.stringify(shown, null, 2));
          return;
        }

        info(`Total: ${chalk.bold(String(sessions.length))} sessions`);
        if (opts.active) info(`Active: ${chalk.bold(String(filtered.length))}`);
        console.log('');

        for (const s of shown) {
          const statusIcon = s.status === 'active' ? chalk.green('●') : chalk.gray('○');
          const timeAgo = formatTimeAgo(s.lastModified);
          const sizeStr = formatBytes(s.size);

          console.log(`  ${statusIcon} ${chalk.bold.cyan(s.id.substring(0, 12))} ${chalk.gray(timeAgo)} ${chalk.dim(sizeStr)} ${chalk.gray(`${s.messageCount} msgs`)}`);
          if (s.model) console.log(`    ${chalk.dim('Model:')} ${s.model}`);
          if (s.workspace) console.log(`    ${chalk.dim('Dir:')} ${chalk.gray(s.workspace)}`);
        }

        if (filtered.length > limit) {
          console.log(`\n  ${chalk.gray(`Showing ${limit} of ${filtered.length}. Use --limit to see more.`)}`);
        }
      } catch (err) { handleError(err); }
    });

  // session search
  session
    .command('search <query>')
    .description('Search session content across all sessions')
    .option('-n, --limit <n>', 'Max results', '10')
    .action((query, opts) => {
      try {
        heading(`🔍 Search Sessions: "${query}"`);

        const sessions = findSessions();
        const queryLower = query.toLowerCase();
        const limit = parseInt(opts.limit) || 10;
        const matches: { session: SessionInfo; matchCount: number; preview: string }[] = [];

        for (const s of sessions) {
          try {
            const content = readFileSync(s.path, 'utf-8').toLowerCase();
            if (content.includes(queryLower)) {
              // Count matches
              let count = 0;
              let idx = 0;
              while ((idx = content.indexOf(queryLower, idx)) !== -1) { count++; idx++; }

              // Get preview snippet
              const origContent = readFileSync(s.path, 'utf-8');
              const matchIdx = origContent.toLowerCase().indexOf(queryLower);
              const start = Math.max(0, matchIdx - 60);
              const end = Math.min(origContent.length, matchIdx + query.length + 60);
              let preview = origContent.substring(start, end).replace(/\n/g, ' ').trim();
              if (start > 0) preview = '...' + preview;
              if (end < origContent.length) preview += '...';

              matches.push({ session: s, matchCount: count, preview });
            }
          } catch { /* skip unreadable */ }
        }

        matches.sort((a, b) => b.matchCount - a.matchCount);
        const shown = matches.slice(0, limit);

        if (shown.length === 0) {
          warn(`No sessions matching "${query}"`);
          return;
        }

        info(`Found in ${chalk.bold(String(matches.length))} session(s)`);
        console.log('');

        for (const m of shown) {
          console.log(`  ${chalk.bold.cyan(m.session.id.substring(0, 12))} ${chalk.yellow(`${m.matchCount} match(es)`)} ${chalk.gray(formatTimeAgo(m.session.lastModified))}`);
          console.log(`    ${chalk.dim(m.preview.substring(0, 120))}`);
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // session show
  session
    .command('show <id>')
    .description('Show messages from a session')
    .option('-n, --limit <n>', 'Show last N messages', '20')
    .action((id, opts) => {
      try {
        const sessions = findSessions();
        const match = sessions.find(s => s.id.startsWith(id));

        if (!match) {
          fail(`Session "${id}" not found`);
          return;
        }

        heading(`📋 Session ${match.id.substring(0, 12)}`);
        label('Path', match.path);
        label('Size', formatBytes(match.size));
        label('Messages', String(match.messageCount));
        label('Last modified', formatTimeAgo(match.lastModified));
        if (match.model) label('Model', match.model);
        if (match.workspace) label('Workspace', match.workspace);
        divider();

        const limit = parseInt(opts.limit) || 20;
        const messages = getSessionMessages(match, limit);

        for (const msg of messages) {
          if (!msg.role) continue;
          const roleColor = msg.role === 'user' ? chalk.green : msg.role === 'assistant' ? chalk.blue : chalk.gray;
          const roleName = roleColor(msg.role.toUpperCase());
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          const truncated = content.length > 300 ? content.substring(0, 300) + '...' : content;
          console.log(`\n  ${roleName}`);
          console.log(`  ${chalk.dim(truncated)}`);
        }
      } catch (err) { handleError(err); }
    });

  // session diff
  session
    .command('diff [id]')
    .description('Show git diff for a session workspace')
    .action((id) => {
      try {
        let targetDir = process.cwd();

        if (id) {
          const sessions = findSessions();
          const match = sessions.find(s => s.id.startsWith(id));
          if (match?.workspace) {
            targetDir = match.workspace;
          } else if (match) {
            warn(`Session found but no workspace recorded. Using current dir.`);
          } else {
            fail(`Session "${id}" not found`);
            return;
          }
        }

        heading(`📊 Session Diff`);
        info(`Workspace: ${chalk.gray(targetDir)}`);
        console.log('');

        try {
          const diff = execSync('git diff --stat', { cwd: targetDir, encoding: 'utf-8' });
          if (diff.trim()) {
            console.log(diff);
            divider();
            const fullDiff = execSync('git diff --color', { cwd: targetDir, encoding: 'utf-8', maxBuffer: 1024 * 1024 });
            console.log(fullDiff);
          } else {
            success('No uncommitted changes.');
          }
        } catch {
          warn('Not a git repository or git not available.');
        }
      } catch (err) { handleError(err); }
    });

  // Default: list sessions
  session.action(() => {
    const sessions = findSessions();
    heading('📋 OpenCode Sessions');

    if (sessions.length === 0) {
      infoBox('No Sessions', 'No OpenCode sessions found.');
      return;
    }

    info(`Total: ${sessions.length} sessions`);
    console.log('');
    const shown = sessions.slice(0, 10);
    for (const s of shown) {
      const statusIcon = s.status === 'active' ? chalk.green('●') : chalk.gray('○');
      console.log(`  ${statusIcon} ${chalk.bold.cyan(s.id.substring(0, 12))} ${chalk.gray(formatTimeAgo(s.lastModified))} ${chalk.dim(formatBytes(s.size))}`);
    }
    if (sessions.length > 10) {
      info(`Use ${chalk.cyan('omocs session list')} for full list.`);
    }
  });
}
