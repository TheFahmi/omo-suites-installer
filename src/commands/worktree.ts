import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { heading, success, fail, warn, info, icons, handleError, infoBox, label, divider } from '../utils/ui.ts';

// ─── Helpers ─────────────────────────────────────────────────────────
function isGitRepo(dir: string): boolean {
  try {
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function getGitRoot(dir: string): string {
  return execSync('git rev-parse --show-toplevel', { cwd: dir, encoding: 'utf-8' }).trim();
}

function listWorktrees(dir: string): { path: string; branch: string; head: string; isBare: boolean }[] {
  try {
    const output = execSync('git worktree list --porcelain', { cwd: dir, encoding: 'utf-8' });
    const worktrees: { path: string; branch: string; head: string; isBare: boolean }[] = [];
    let current: any = {};

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.replace('worktree ', ''), branch: '', head: '', isBare: false };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.replace('HEAD ', '').substring(0, 8);
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch refs/heads/', '');
      } else if (line === 'bare') {
        current.isBare = true;
      } else if (line === 'detached') {
        current.branch = '(detached)';
      }
    }
    if (current.path) worktrees.push(current);
    return worktrees;
  } catch { return []; }
}

// ─── Register Command ────────────────────────────────────────────────
export function registerWorktreeCommand(program: Command): void {
  const wt = program
    .command('worktree')
    .description('Git worktree management for task isolation');

  // worktree list
  wt.command('list')
    .description('List all git worktrees')
    .action(() => {
      try {
        if (!isGitRepo(process.cwd())) {
          fail('Not a git repository.');
          return;
        }

        heading('🌳 Git Worktrees');
        const trees = listWorktrees(process.cwd());

        if (trees.length <= 1) {
          infoBox('No Worktrees', `Only the main worktree exists.\n\nCreate one: ${chalk.cyan('omocs worktree create <branch> [path]')}`);
          return;
        }

        info(`${trees.length} worktree(s):`);
        console.log('');

        for (const t of trees) {
          const branchColor = t.branch === '(detached)' ? chalk.yellow : chalk.green;
          console.log(`  ${icons.folder} ${chalk.bold(t.path)}`);
          console.log(`    Branch: ${branchColor(t.branch)} ${chalk.gray(`(${t.head})`)}`);
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // worktree create
  wt.command('create <branch>')
    .description('Create a new worktree for isolated task work')
    .option('-p, --path <path>', 'Custom worktree directory')
    .option('-b, --new-branch', 'Create a new branch (default: use existing)')
    .action((branch, opts) => {
      try {
        if (!isGitRepo(process.cwd())) {
          fail('Not a git repository.');
          return;
        }

        const gitRoot = getGitRoot(process.cwd());
        const worktreePath = opts.path || join(gitRoot, '..', `${join(gitRoot).split('/').pop()}-${branch}`);

        heading('🌳 Create Worktree');
        label('Branch', branch);
        label('Path', worktreePath);
        console.log('');

        try {
          const branchFlag = opts.newBranch ? '-b' : '';
          const cmd = branchFlag
            ? `git worktree add ${branchFlag} "${branch}" "${worktreePath}"`
            : `git worktree add "${worktreePath}" "${branch}"`;
          execSync(cmd, { cwd: gitRoot, stdio: 'pipe' });
          success(`Worktree created at ${chalk.cyan(worktreePath)}`);
          info(`Switch: ${chalk.cyan(`cd ${worktreePath}`)}`);
        } catch (e: any) {
          const stderr = e.stderr?.toString() || '';
          if (stderr.includes('already exists')) {
            fail(`Branch "${branch}" already exists. Use -b to create new.`);
          } else {
            fail(`Failed: ${stderr.trim()}`);
          }
        }
      } catch (err) { handleError(err); }
    });

  // worktree remove
  wt.command('remove <path>')
    .description('Remove a worktree')
    .option('--force', 'Force remove even with uncommitted changes')
    .action((wtPath, opts) => {
      try {
        if (!isGitRepo(process.cwd())) {
          fail('Not a git repository.');
          return;
        }

        heading('🌳 Remove Worktree');

        try {
          const forceFlag = opts.force ? '--force' : '';
          execSync(`git worktree remove ${forceFlag} "${wtPath}"`, { cwd: process.cwd(), stdio: 'pipe' });
          success(`Worktree removed: ${wtPath}`);
        } catch (e: any) {
          const stderr = e.stderr?.toString() || '';
          if (stderr.includes('contains modified')) {
            fail(`Worktree has uncommitted changes. Use --force to remove anyway.`);
          } else {
            fail(`Failed: ${stderr.trim()}`);
          }
        }
      } catch (err) { handleError(err); }
    });

  // worktree prune
  wt.command('prune')
    .description('Clean up stale worktree references')
    .action(() => {
      try {
        if (!isGitRepo(process.cwd())) {
          fail('Not a git repository.');
          return;
        }
        execSync('git worktree prune', { cwd: process.cwd(), stdio: 'pipe' });
        success('Pruned stale worktree references.');
      } catch (err) { handleError(err); }
    });

  // Default: list
  wt.action(() => {
    if (!isGitRepo(process.cwd())) {
      fail('Not a git repository.');
      return;
    }
    const trees = listWorktrees(process.cwd());
    heading('🌳 Git Worktrees');
    if (trees.length <= 1) {
      info('Only main worktree. Create with: ' + chalk.cyan('omocs worktree create <branch>'));
      return;
    }
    for (const t of trees) {
      console.log(`  ${icons.folder} ${chalk.bold(t.path)} → ${chalk.green(t.branch)} ${chalk.gray(t.head)}`);
    }
  });
}
