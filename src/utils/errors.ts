import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

// ─── Types ────────────────────────────────────────────────────────────

export type ExitCode =
  | 0   // success
  | 1   // general error
  | 2   // usage/CLI error
  | 126 // permission denied
  | 127 // command not found
  | 128; // signal/interrupt

export interface ErrorContext {
  command?: string;
  configPath?: string;
  filePath?: string;
  url?: string;
  tool?: string;
  [key: string]: string | undefined;
}

export interface Suggestion {
  type: 'did-you-mean' | 'fix' | 'hint';
  message: string;
  command?: string;
}

// ─── Levenshtein Distance ────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use typed arrays for better performance on longer strings
  const dp: number[] = Array.from({ length: (m + 1) * (n + 1) }, () => 0);
  for (let i = 0; i <= m; i++) dp[i * (n + 1)] = i;
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i * (n + 1) + j] = Math.min(
        dp[(i - 1) * (n + 1) + j] + 1,     // deletion
        dp[i * (n + 1) + (j - 1)] + cost,  // substitution
        dp[(i - 1) * (n + 1) + (j - 1)] + 1 // insertion
      );
    }
  }
  return dp[m * (n + 1) + n];
}

// ─── didYouMean ──────────────────────────────────────────────────────

/**
 * Returns the closest command suggestion based on Levenshtein distance.
 * Returns null if no command is within a reasonable edit distance threshold.
 */
export function didYouMean(
  input: string,
  commands: string[],
  threshold = 3
): string | null {
  if (!input || commands.length === 0) return null;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const cmd of commands) {
    // Strip subcommand prefix patterns (e.g., "config validate" → "config:validate")
    const normalized = cmd.toLowerCase().replace(/\s+/g, '');
    const inputNorm = input.toLowerCase().replace(/\s+/g, '');

    // Exact prefix match gets priority (e.g., "conf" → "config")
    if (cmd.toLowerCase().startsWith(input.toLowerCase())) {
      return cmd;
    }

    const distance = levenshtein(inputNorm, normalized);
    // Also check fuzzy partial match for compound commands
    const parts = cmd.split(/\s+/);
    for (const part of parts) {
      const partDist = levenshtein(input.toLowerCase(), part.toLowerCase());
      if (partDist < bestDistance && partDist <= threshold) {
        bestDistance = partDist;
        bestMatch = cmd;
      }
    }

    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = cmd;
    }
  }

  return bestMatch;
}

// ─── Exit Code Mapping ───────────────────────────────────────────────

export function getExitCode(error: unknown): ExitCode {
  if (!(error instanceof Error)) return 1;

  const msg = error.message.toLowerCase();
  const code = (error as any).code as string | undefined;

  // Permission / access denied
  if (
    code === 'EACCES' ||
    msg.includes('eacces') ||
    msg.includes('permission denied') ||
    msg.includes('eperm') ||
    msg.includes('operation not permitted')
  ) {
    return 126;
  }

  // Command / module / binary not found
  if (
    code === 'ENOENT' ||
    code === 'MODULE_NOT_FOUND' ||
    code === 'ERR_REQUIRE_ESM' ||
    msg.includes('enoent') ||
    msg.includes('no such file') ||
    msg.includes('cannot find module') ||
    msg.includes('command not found') ||
    msg.includes('opencode') && msg.includes('not found')
  ) {
    return 127;
  }

  // Usage / argument parsing
  if (
    code === 'EUSAGE' ||
    msg.includes('invalid option') ||
    msg.includes('missing required') ||
    msg.includes('expected ') ||
    msg.includes('unknown option')
  ) {
    return 2;
  }

  return 1;
}

// ─── Error Classification ────────────────────────────────────────────

export type ErrorType =
  | 'unknown-command'
  | 'config'
  | 'network'
  | 'permission'
  | 'not-found'
  | 'usage'
  | 'timeout'
  | 'json'
  | 'native-module'
  | 'general';

function classifyError(error: unknown): ErrorType {
  if (!(error instanceof Error)) return 'general';
  const msg = error.message.toLowerCase();
  const code = (error as any).code as string | undefined;

  if (msg.includes('no such command') || msg.includes('didn\'t match any command') || msg.includes('unknown command')) {
    return 'unknown-command';
  }
  if (msg.includes('enoent') || msg.includes('no such file') || code === 'ENOENT') {
    if (msg.includes('config') || msg.includes('.omocs') || msg.includes('.opencode')) return 'config';
    return 'not-found';
  }
  if (code === 'EACCES' || code === 'EPERM' || msg.includes('eacces') || msg.includes('permission denied') || msg.includes('operation not permitted')) {
    return 'permission';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || msg.includes('fetch failed') || msg.includes('network') || msg.includes('connection')) {
    return 'network';
  }
  if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('parse error')) {
    return 'json';
  }
  if (msg.includes('better-sqlite3') || msg.includes('native module') || msg.includes('dlopen') || msg.includes('cannot load native')) {
    return 'native-module';
  }
  if (msg.includes('timeout') || code === 'ETIMEDOUT') {
    return 'timeout';
  }
  if (msg.includes('invalid option') || msg.includes('missing required') || msg.includes('expected ') || msg.includes('unknown option')) {
    return 'usage';
  }
  return 'general';
}

// ─── Suggest Fix ─────────────────────────────────────────────────────

/**
 * Returns actionable fix suggestions based on error classification.
 */
export function suggestFix(error: unknown, ctx?: ErrorContext): Suggestion[] {
  const type = classifyError(error);
  const suggestions: Suggestion[] = [];

  switch (type) {
    case 'config':
      suggestions.push({
        type: 'fix',
        message: 'Run `omocs config validate` to check your config file.',
      });
      if (ctx?.configPath) {
        suggestions.push({
          type: 'hint',
          message: `Config path: ${ctx.configPath}`,
        });
      }
      suggestions.push({
        type: 'hint',
        message: 'Try `omocs init --force` to reset to defaults, or check for .bak backup files.',
      });
      break;

    case 'network':
      suggestions.push({
        type: 'fix',
        message: 'Check your internet connection.',
      });
      suggestions.push({
        type: 'fix',
        message: 'Try increasing the timeout: `--timeout 30000` or `--timeout 60000`',
      });
      if (ctx?.url) {
        suggestions.push({
          type: 'hint',
          message: `URL: ${ctx.url}`,
        });
      }
      break;

    case 'permission':
      suggestions.push({
        type: 'fix',
        message: 'Try running with sudo (e.g., `sudo omocs ...`)',
      });
      if (ctx?.filePath) {
        suggestions.push({
          type: 'fix',
          message: `Check file permissions: chmod +rw "${ctx.filePath}"`,
        });
      }
      break;

    case 'not-found':
      if (error instanceof Error && error.message.toLowerCase().includes('opencode')) {
        suggestions.push({
          type: 'fix',
          message: 'Install OpenCode: npm i -g opencode',
        });
        suggestions.push({
          type: 'hint',
          message: 'Verify installation: opencode --version',
        });
      } else {
        suggestions.push({
          type: 'fix',
          message: 'Run `omocs init` first if starting from scratch.',
        });
        if (ctx?.filePath) {
          suggestions.push({
            type: 'hint',
            message: `Missing: ${ctx.filePath}`,
          });
        }
      }
      break;

    case 'timeout':
      suggestions.push({
        type: 'fix',
        message: 'Try increasing the timeout: `--timeout 60000` or `--timeout 120000`',
      });
      suggestions.push({
        type: 'hint',
        message: 'If the issue persists, check your network or remote service status.',
      });
      break;

    case 'json':
      suggestions.push({
        type: 'fix',
        message: 'Config file may be corrupted. Check for .omocs/logs/*.bak backup files.',
      });
      suggestions.push({
        type: 'fix',
        message: 'Try `omocs init --force` to reset the config.',
      });
      break;

    case 'native-module':
      suggestions.push({
        type: 'fix',
        message: 'Try rebuilding native modules: `npm rebuild`',
      });
      suggestions.push({
        type: 'fix',
        message: 'Or reinstall omo-suites: `npm install -g omo-suites@latest`',
      });
      break;

    case 'usage':
      suggestions.push({
        type: 'hint',
        message: 'Run `omocs <command> --help` for usage information.',
      });
      break;

    case 'unknown-command': {
      // Fall through — handled separately in CLI
      break;
    }

    case 'general':
    default:
      suggestions.push({
        type: 'hint',
        message: 'Run `omocs doctor` to diagnose system health.',
      });
      suggestions.push({
        type: 'hint',
        message: 'Run with `--debug` for more details.',
      });
      break;
  }

  return suggestions;
}

// ─── Format Error ────────────────────────────────────────────────────

/**
 * Returns a human-readable error string with optional context.
 */
export function formatError(error: unknown, ctx?: ErrorContext): string {
  if (error instanceof Error) {
    let msg = error.message;

    // Strip noisy internals
    msg = msg.replace(/\n[\s\S]*/g, '');
    msg = msg.trim();

    // Capitalize first letter
    if (msg.length > 0) {
      msg = msg.charAt(0).toUpperCase() + msg.slice(1);
    }

    if (ctx?.command) {
      msg = `\`${ctx.command}\`: ${msg}`;
    }

    return msg;
  }

  return String(error);
}

/**
 * Pretty-prints a formatted error to the console with suggestions.
 */
export function printError(error: unknown, ctx?: ErrorContext): void {
  const type = classifyError(error);
  const message = formatError(error, ctx);
  const suggestions = suggestFix(error, ctx);
  const exitCode = getExitCode(error);

  // Build suggestion lines
  const suggestionLines: string[] = [];
  for (const s of suggestions) {
    const prefix = s.type === 'fix' ? '🔧' : '💡';
    suggestionLines.push(`  ${prefix} ${s.message}`);
  }

  // Use boxen for structured error display
  if (suggestionLines.length > 0) {
    console.log(
      boxen(suggestionLines.join('\n'), {
        title: chalk.bold.red('Error'),
        titleAlignment: 'center',
        padding: 1,
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'red',
      })
    );
  }

  console.log(chalk.red(`  ✗ ${message}`));

  // Debug-only: full stack
  if (process.env.DEBUG === '1' && error instanceof Error) {
    console.error(chalk.gray(error.stack || ''));
  } else {
    console.log(chalk.gray('  Run with --debug for full stack trace.'));
  }

  console.log(chalk.gray(`  (exit code: ${exitCode})`));
}

// ─── Did You Mean Helper ─────────────────────────────────────────────

/**
 * Prints a "Did you mean..." suggestion for unknown commands.
 * Integrates with Commander's configureOutput.
 */
export function formatDidYouMean(input: string, commands: string[]): string {
  const suggestion = didYouMean(input, commands);
  if (!suggestion) return '';

  return chalk.yellow(`\n  Did you mean "${suggestion}"?`);
}
