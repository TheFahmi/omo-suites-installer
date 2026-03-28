import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { findPackageJson } from './find-package-json.ts';
import { readFileSync } from 'fs';

// Find package.json version
function getVersion(): string {
  try {
    return JSON.parse(readFileSync(findPackageJson(import.meta.url), 'utf-8')).version || '?';
  } catch {}
  return '?';
}

// ─── Banner ──────────────────────────────────────────────────────────
export function showBanner(): void {
  const version = getVersion();
  const banner = chalk.bold.cyan(`
   ██████╗ ███╗   ███╗ ██████╗  ██████╗███████╗
  ██╔═══██╗████╗ ████║██╔═══██╗██╔════╝██╔════╝
  ██║   ██║██╔████╔██║██║   ██║██║     ███████╗
  ██║   ██║██║╚██╔╝██║██║   ██║██║     ╚════██║
  ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╗███████║
   ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚══════╝
  `);
  console.log(banner);
  console.log(chalk.gray(`  OMO Suites v${version} — CLI toolkit for OpenCode power users\n`));
}

// ─── Box Messages ────────────────────────────────────────────────────
export function infoBox(title: string, content: string): void {
  console.log(
    boxen(content, {
      title: chalk.bold.blue(title),
      titleAlignment: 'center',
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'blue',
    })
  );
}

export function successBox(title: string, content: string): void {
  console.log(
    boxen(content, {
      title: chalk.bold.green(title),
      titleAlignment: 'center',
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'green',
    })
  );
}

export function errorBox(title: string, content: string): void {
  console.log(
    boxen(content, {
      title: chalk.bold.red(title),
      titleAlignment: 'center',
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'red',
    })
  );
}

export function warnBox(title: string, content: string): void {
  console.log(
    boxen(content, {
      title: chalk.bold.yellow(title),
      titleAlignment: 'center',
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'yellow',
    })
  );
}

// ─── Status Icons ────────────────────────────────────────────────────
export const icons = {
  success: chalk.green('✅'),
  fail: chalk.red('❌'),
  warn: chalk.yellow('⚠️'),
  info: chalk.blue('ℹ️'),
  arrow: chalk.cyan('→'),
  dot: chalk.gray('•'),
  star: chalk.yellow('⭐'),
  rocket: '🚀',
  wrench: '🔧',
  shield: '🛡️',
  chart: '📊',
  key: '🔑',
  lock: '🔒',
  folder: '📁',
  file: '📄',
  check: chalk.green('✓'),
  cross: chalk.red('✗'),
  spinner: chalk.cyan('◌'),
};

// ─── Table Builder ───────────────────────────────────────────────────
export function createTable(head: string[], rows: (string | number)[][]): string {
  const table = new Table({
    head: head.map(h => chalk.bold.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
    },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│',
    },
  });
  for (const row of rows) {
    table.push(row.map(String));
  }
  return table.toString();
}

// ─── Formatted Output ────────────────────────────────────────────────
export function heading(text: string): void {
  console.log(`\n${chalk.bold.underline(text)}\n`);
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.gray(key + ':')} ${value}`);
}

export function bullet(text: string): void {
  console.log(`  ${icons.dot} ${text}`);
}

export function success(text: string): void {
  console.log(`  ${icons.success} ${text}`);
}

export function fail(text: string): void {
  console.log(`  ${icons.fail} ${text}`);
}

export function warn(text: string): void {
  console.log(`  ${icons.warn} ${text}`);
}

export function info(text: string): void {
  console.log(`  ${icons.info} ${text}`);
}

export function divider(): void {
  console.log(chalk.gray('  ─'.repeat(30)));
}

import { isDebug } from './debug.ts';

// ─── Error Handler ───────────────────────────────────────────────────
export function handleError(error: unknown): void {
  if (error instanceof Error) {
    errorBox('Error', error.message);

    // Contextual help suggestions per error type
    const msg = error.message.toLowerCase();
    if (msg.includes('enoent') || msg.includes('no such file')) {
      console.log(chalk.yellow('  💡 File or directory not found. Try running `omocs init` first.'));
    } else if (msg.includes('eacces') || msg.includes('permission denied')) {
      console.log(chalk.yellow('  💡 Permission denied. Try running with sudo or check file permissions.'));
    } else if (msg.includes('econnrefused') || msg.includes('econnreset') || msg.includes('fetch failed')) {
      console.log(chalk.yellow('  💡 Connection failed. Check your internet connection and try again.'));
    } else if (msg.includes('json') || msg.includes('unexpected token')) {
      console.log(chalk.yellow('  💡 Config file may be corrupted. Check for .bak backup files or run `omocs init --force`.'));
    } else if (msg.includes('module') || msg.includes('cannot find')) {
      console.log(chalk.yellow('  💡 Missing dependency. Try `npm install -g omo-suites@latest` to reinstall.'));
    } else if (msg.includes('timeout')) {
      console.log(chalk.yellow('  💡 Operation timed out. Check your network or try again later.'));
    } else if (msg.includes('better-sqlite3') || msg.includes('native module')) {
      console.log(chalk.yellow('  💡 Native module issue. Try `npm rebuild` or reinstall omo-suites.'));
    }

    if (isDebug()) {
      console.error(chalk.gray(error.stack || ''));
    } else {
      console.log(chalk.gray('  Set --debug for full stack trace.'));
    }
  } else {
    errorBox('Error', String(error));
  }
  process.exit(1);
}
