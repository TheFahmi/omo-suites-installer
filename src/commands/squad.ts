import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { execSync, spawn } from 'child_process';
import { heading, success, fail, warn, info, icons, handleError, infoBox, label, divider } from '../utils/ui.ts';

// ─── Types ───────────────────────────────────────────────────────────
interface SquadMember {
  id: string;
  name: string;
  task: string;
  status: 'running' | 'idle' | 'done' | 'error';
  pid?: number;
  startedAt: string;
  workspace: string;
  agent: string;
  tmuxSession?: string;
}

interface SquadState {
  members: SquadMember[];
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const SQUAD_DIR = join(homedir(), '.omocs', 'squad');
const SQUAD_STATE = join(SQUAD_DIR, 'state.json');

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readState(): SquadState {
  if (existsSync(SQUAD_STATE)) {
    try { return JSON.parse(readFileSync(SQUAD_STATE, 'utf-8')); } catch {}
  }
  return { members: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function writeState(state: SquadState): void {
  ensureDir(SQUAD_DIR);
  state.updatedAt = new Date().toISOString();
  writeFileSync(SQUAD_STATE, JSON.stringify(state, null, 2), 'utf-8');
}

function hasTmux(): boolean {
  try { execSync('tmux -V', { stdio: 'pipe' }); return true; } catch { return false; }
}

function hasOpenCode(): boolean {
  try { execSync('which opencode', { stdio: 'pipe' }); return true; } catch { return false; }
}

function isTmuxSessionAlive(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatElapsed(startedAt: string): string {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(elapsed / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

// ─── Register Command ────────────────────────────────────────────────
export function registerSquadCommand(program: Command): void {
  const squad = program
    .command('squad')
    .description('Launch and manage parallel OpenCode agent instances');

  // squad launch
  squad
    .command('launch <task>')
    .description('Launch a new OpenCode instance with a task')
    .option('-n, --name <name>', 'Instance name')
    .option('-d, --dir <dir>', 'Working directory', process.cwd())
    .option('-a, --agent <agent>', 'Agent type (sisyphus|prometheus|metis|momus)', 'sisyphus')
    .option('--model <model>', 'LLM model to use')
    .option('--no-tmux', 'Run without tmux (foreground)')
    .action((task, opts) => {
      try {
        heading('🚀 Launch Agent');

        const useTmux = opts.tmux !== false && hasTmux();
        const id = generateId();
        const name = opts.name || `agent-${id}`;
        const sessionName = `omocs-${name}`;

        if (useTmux && isTmuxSessionAlive(sessionName)) {
          fail(`Session "${sessionName}" already exists. Kill it first or use a different name.`);
          return;
        }

        const member: SquadMember = {
          id,
          name,
          task,
          status: 'running',
          startedAt: new Date().toISOString(),
          workspace: opts.dir,
          agent: opts.agent,
          tmuxSession: useTmux ? sessionName : undefined,
        };

        if (useTmux) {
          // Build opencode command
          let cmd = `opencode`;
          if (opts.model) cmd += ` -m ${opts.model}`;

          // Launch in tmux
          try {
            execSync(`tmux new-session -d -s "${sessionName}" -c "${opts.dir}" "${cmd}"`, { stdio: 'pipe' });

            // Send the task as initial prompt after a small delay
            setTimeout(() => {
              try {
                const escapedTask = task.replace(/"/g, '\\"');
                execSync(`tmux send-keys -t "${sessionName}" "${escapedTask}" Enter`, { stdio: 'pipe' });
              } catch { /* best effort */ }
            }, 2000);

            member.status = 'running';
            success(`Launched in tmux: ${chalk.cyan(sessionName)}`);
            info(`Attach: ${chalk.cyan(`tmux attach -t ${sessionName}`)}`);
          } catch (e: any) {
            fail(`Failed to launch tmux session: ${e.message}`);
            return;
          }
        } else {
          // Non-tmux mode — just show the command
          let cmd = `cd "${opts.dir}" && opencode`;
          if (opts.model) cmd += ` -m ${opts.model}`;

          info(`Run manually: ${chalk.cyan(cmd)}`);
          info(`Then type your task: ${chalk.gray(task)}`);
          member.status = 'idle';
        }

        // Save state
        const state = readState();
        state.members.push(member);
        writeState(state);

        label('ID', id);
        label('Name', name);
        label('Task', task);
        label('Agent', opts.agent);
        label('Dir', opts.dir);
      } catch (err) { handleError(err); }
    });

  // squad status
  squad
    .command('status')
    .description('Show all running agents')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      try {
        heading('🎯 Squad Status');

        const state = readState();

        if (state.members.length === 0) {
          infoBox('No Agents', `No agents running.\n\nLaunch one: ${chalk.cyan('omocs squad launch "your task"')}`);
          return;
        }

        // Update status from tmux
        for (const m of state.members) {
          if (m.tmuxSession) {
            m.status = isTmuxSessionAlive(m.tmuxSession) ? 'running' : 'done';
          }
        }
        writeState(state);

        if (opts.json) {
          console.log(JSON.stringify(state.members, null, 2));
          return;
        }

        const running = state.members.filter(m => m.status === 'running');
        const done = state.members.filter(m => m.status === 'done');

        info(`Running: ${chalk.green(String(running.length))} | Done: ${chalk.gray(String(done.length))} | Total: ${state.members.length}`);
        console.log('');

        for (const m of state.members) {
          const statusIcon = m.status === 'running' ? chalk.green('●')
            : m.status === 'done' ? chalk.gray('✓')
            : m.status === 'error' ? chalk.red('✗')
            : chalk.yellow('○');

          const elapsed = formatElapsed(m.startedAt);

          console.log(`  ${statusIcon} ${chalk.bold.cyan(m.name)} ${chalk.gray(`(${m.id})`)} ${chalk.dim(elapsed)}`);
          console.log(`    ${chalk.dim('Task:')} ${m.task.substring(0, 80)}${m.task.length > 80 ? '...' : ''}`);
          console.log(`    ${chalk.dim('Agent:')} ${m.agent} ${chalk.dim('Dir:')} ${chalk.gray(m.workspace)}`);
          if (m.tmuxSession) {
            console.log(`    ${chalk.dim('tmux:')} ${chalk.cyan(m.tmuxSession)}`);
          }
          console.log('');
        }

        if (running.length > 0) {
          info(`Attach to agent: ${chalk.cyan('tmux attach -t <session-name>')}`);
        }
      } catch (err) { handleError(err); }
    });

  // squad kill
  squad
    .command('kill <nameOrId>')
    .description('Kill a running agent')
    .action((nameOrId) => {
      try {
        heading('💀 Kill Agent');

        const state = readState();
        const idx = state.members.findIndex(m => m.name === nameOrId || m.id === nameOrId);

        if (idx === -1) {
          fail(`Agent "${nameOrId}" not found.`);
          return;
        }

        const member = state.members[idx];

        // Kill tmux session
        if (member.tmuxSession && isTmuxSessionAlive(member.tmuxSession)) {
          try {
            execSync(`tmux kill-session -t "${member.tmuxSession}"`, { stdio: 'pipe' });
            success(`Killed tmux session: ${member.tmuxSession}`);
          } catch { warn('Could not kill tmux session.'); }
        }

        state.members.splice(idx, 1);
        writeState(state);

        success(`Agent "${member.name}" removed.`);
      } catch (err) { handleError(err); }
    });

  // squad clean
  squad
    .command('clean')
    .description('Remove all completed/dead agents from the list')
    .action(() => {
      try {
        const state = readState();
        const before = state.members.length;

        // Update status
        for (const m of state.members) {
          if (m.tmuxSession && !isTmuxSessionAlive(m.tmuxSession)) {
            m.status = 'done';
          }
        }

        state.members = state.members.filter(m => m.status === 'running');
        writeState(state);

        const removed = before - state.members.length;
        success(`Cleaned ${removed} completed agent(s). ${state.members.length} still running.`);
      } catch (err) { handleError(err); }
    });

  // Default: status
  squad.action(() => {
    const state = readState();
    heading('🎯 Squad — Parallel Agent Manager');

    if (state.members.length === 0) {
      infoBox('Squad', [
        'Launch and manage parallel OpenCode agents.',
        '',
        `  ${chalk.cyan('omocs squad launch "task"')}   — launch agent`,
        `  ${chalk.cyan('omocs squad status')}          — view all agents`,
        `  ${chalk.cyan('omocs squad kill <name>')}      — kill agent`,
        `  ${chalk.cyan('omocs squad clean')}            — remove completed`,
      ].join('\n'));
      return;
    }

    // Update statuses
    for (const m of state.members) {
      if (m.tmuxSession) m.status = isTmuxSessionAlive(m.tmuxSession) ? 'running' : 'done';
    }
    writeState(state);

    for (const m of state.members) {
      const icon = m.status === 'running' ? chalk.green('●') : chalk.gray('○');
      console.log(`  ${icon} ${chalk.bold.cyan(m.name)} — ${m.task.substring(0, 60)}... ${chalk.gray(formatElapsed(m.startedAt))}`);
    }
  });
}
