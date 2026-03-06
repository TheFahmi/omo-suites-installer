import chalk from 'chalk';

// ─── Colors (Gold accent, NO purple/violet/magenta) ──────────────────
export const gold = chalk.hex('#d4a853');
export const goldBold = chalk.hex('#d4a853').bold;
export const dim = chalk.dim;
export const bold = chalk.bold;
export const white = chalk.white;
export const green = chalk.green;
export const red = chalk.red;
export const cyan = chalk.cyan;
export const yellow = chalk.yellow;
export const gray = chalk.gray;
export const bgGold = chalk.bgHex('#d4a853').black;

// ─── Box Drawing Characters ──────────────────────────────────────────
export const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤',
  cross: '┼',
};

// ─── Terminal Helpers ────────────────────────────────────────────────
export function getTerminalSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function moveCursor(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

// ─── String Helpers ──────────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  if (stripAnsi(str).length <= maxLen) return str;
  // Find the right place to cut considering ANSI codes
  let visible = 0;
  let i = 0;
  while (i < str.length && visible < maxLen - 1) {
    if (str[i] === '\x1b') {
      // Skip ANSI escape sequence
      const end = str.indexOf('m', i);
      if (end !== -1) {
        i = end + 1;
        continue;
      }
    }
    visible++;
    i++;
  }
  return str.slice(0, i) + '…';
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function padEnd(str: string, len: number): string {
  const visible = stripAnsi(str).length;
  if (visible >= len) return str;
  return str + ' '.repeat(len - visible);
}

export function padStart(str: string, len: number): string {
  const visible = stripAnsi(str).length;
  if (visible >= len) return str;
  return ' '.repeat(len - visible) + str;
}

export function centerText(str: string, width: number): string {
  const visible = stripAnsi(str).length;
  if (visible >= width) return str;
  const left = Math.floor((width - visible) / 2);
  const right = width - visible - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

// ─── Model Display Helpers ───────────────────────────────────────────
export function shortModel(model: string): string {
  // Remove provider prefix for display
  const parts = model.split('/');
  return parts.length > 1 ? parts[1] : model;
}

export function modelColor(model: string): string {
  if (model.includes('opus')) return gold(shortModel(model));
  if (model.includes('codex') || model.includes('gpt')) return green(shortModel(model));
  if (model.includes('gemini')) return cyan(shortModel(model));
  if (model.includes('sonnet')) return yellow(shortModel(model));
  if (model.includes('kimi') || model.includes('k2')) return chalk.hex('#ff6b35')(shortModel(model));
  if (model.includes('ollama') || model.includes('deepseek')) return chalk.hex('#87ceeb')(shortModel(model));
  return white(shortModel(model));
}
