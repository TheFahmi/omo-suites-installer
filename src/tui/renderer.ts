import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  gold, goldBold, dim, bold, white, green, red, cyan, gray, bgGold,
  BOX, getTerminalSize, padEnd, stripAnsi, centerText, truncate,
} from './utils.ts';

const __pkgDir = dirname(dirname(fileURLToPath(import.meta.url)));
let VERSION = 'unknown';
try {
  // Walk up directories to find package.json (works in dev, built, and npm-installed contexts)
  let dir = dirname(fileURLToPath(import.meta.url));
  let found = false;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf-8'));
      if (pkg.name === 'omo-suites' || pkg.name === 'omocs') {
        VERSION = pkg.version;
        found = true;
        break;
      }
    } catch {}
    dir = dirname(dir);
  }
  if (!found) {
    const pkg = JSON.parse(readFileSync(resolve(__pkgDir, 'package.json'), 'utf-8'));
    VERSION = pkg.version;
  }
} catch {}
export { VERSION };

export const MENU_ITEMS = ['Profile', 'Agents', 'MCP', 'LSP', 'Doctor', 'Stats', 'Launchboard'] as const;
export type MenuItem = typeof MENU_ITEMS[number];

export interface RenderContext {
  activePane: 'menu' | 'content';
  menuIndex: number;
  contentLines: string[];
  contentTitle: string;
  footerHint: string;
  searchMode: boolean;
  searchQuery: string;
  helpVisible: boolean;
  // Command bar state
  commandMode: boolean;
  commandInput: string;
  commandResult: string[];
  showResult: boolean;
  resultScrollOffset: number;
  autocompleteSuggestions: string[];
}

// ─── Main Render Function ────────────────────────────────────────────
export function renderScreen(ctx: RenderContext): void {
  const { cols, rows } = getTerminalSize();
  const output: string[] = [];

  if (cols < 60) {
    // Narrow terminal — simplified layout
    renderNarrow(ctx, cols, rows, output);
  } else {
    renderFull(ctx, cols, rows, output);
  }

  // Write all at once to prevent flicker
  process.stdout.write('\x1b[2J\x1b[H' + output.join('\n'));
}

function renderFull(ctx: RenderContext, cols: number, rows: number, output: string[]): void {
  const menuWidth = 18;
  const contentWidth = cols - menuWidth - 3; // 3 for borders
  const totalWidth = cols;
  // Reserve: header (2) + command bar (2: divider + input) + bottom border (1)
  const commandBarHeight = 2;
  const contentHeight = rows - 5 - commandBarHeight; // header (2) + footer (2) + bottom border + command bar

  // ── Header ──
  output.push(gold(BOX.topLeft + BOX.horizontal.repeat(totalWidth - 2) + BOX.topRight));
  const titleLeft = `  OMO Suites v${VERSION}`;
  const titleRight = `${dim('[q] quit')}  `;
  const titlePad = totalWidth - 2 - stripAnsi(titleLeft).length - stripAnsi(titleRight).length;
  output.push(
    gold(BOX.vertical) +
    goldBold(titleLeft) +
    ' '.repeat(Math.max(0, titlePad)) +
    titleRight +
    gold(BOX.vertical)
  );

  // ── Divider with T-junction ──
  output.push(
    gold(BOX.teeRight) +
    gold(BOX.horizontal.repeat(menuWidth)) +
    gold(BOX.teeDown) +
    gold(BOX.horizontal.repeat(contentWidth)) +
    gold(BOX.teeLeft)
  );

  // ── Determine content to show ──
  let displayLines: string[];
  let displayTitle: string;

  if (ctx.showResult && ctx.commandResult.length > 0) {
    // Show command result overlay
    displayTitle = ctx.contentTitle;
    displayLines = ctx.commandResult.slice(ctx.resultScrollOffset);
  } else {
    displayTitle = ctx.contentTitle;
    displayLines = ctx.contentLines;
  }

  // ── Body: Menu + Content ──
  for (let i = 0; i < contentHeight; i++) {
    // Menu cell
    let menuCell: string;
    if (i < MENU_ITEMS.length) {
      const item = MENU_ITEMS[i];
      const isActive = ctx.menuIndex === i;
      const isMenuPane = ctx.activePane === 'menu';

      if (isActive && isMenuPane) {
        menuCell = bgGold(` > ${padEnd(item, menuWidth - 4)} `);
      } else if (isActive) {
        menuCell = gold(` > ${padEnd(item, menuWidth - 4)} `);
      } else {
        menuCell = dim(`   ${padEnd(item, menuWidth - 4)} `);
      }
    } else {
      menuCell = ' '.repeat(menuWidth);
    }

    // Content cell
    let contentCell: string;
    if (i === 0 && displayTitle) {
      contentCell = ' ' + goldBold(truncate(displayTitle, contentWidth - 2));
      contentCell = padEnd(contentCell, contentWidth);
    } else if (i === 1 && displayTitle) {
      contentCell = ' ' + gold(BOX.horizontal.repeat(Math.min(stripAnsi(displayTitle).length, contentWidth - 2)));
      contentCell = padEnd(contentCell, contentWidth);
    } else {
      const lineIdx = i - (displayTitle ? 2 : 0);
      if (lineIdx >= 0 && lineIdx < displayLines.length) {
        contentCell = ' ' + truncate(displayLines[lineIdx], contentWidth - 2);
        contentCell = padEnd(contentCell, contentWidth);
      } else {
        contentCell = ' '.repeat(contentWidth);
      }
    }

    output.push(
      gold(BOX.vertical) +
      padEnd(menuCell, menuWidth) +
      gold(BOX.vertical) +
      contentCell +
      gold(BOX.vertical)
    );
  }

  // ── Command bar divider (full width, no T-junction) ──
  output.push(
    gold(BOX.teeRight) +
    gold(BOX.horizontal.repeat(menuWidth)) +
    gold(BOX.teeUp) +
    gold(BOX.horizontal.repeat(contentWidth)) +
    gold(BOX.teeLeft)
  );

  // ── Command input bar ──
  let commandBarText: string;
  if (ctx.commandMode) {
    commandBarText = ` ${gold('>')} ${white('/' + ctx.commandInput)}${dim('█')}`;
    // Show autocomplete hint if available
    if (ctx.autocompleteSuggestions.length > 0 && ctx.commandInput.length > 0) {
      const hint = ctx.autocompleteSuggestions[0];
      const currentInput = '/' + ctx.commandInput;
      if (hint.startsWith(currentInput) && hint !== currentInput) {
        commandBarText += dim(hint.slice(currentInput.length));
      }
    }
  } else if (ctx.showResult && ctx.commandResult.length > 0) {
    commandBarText = ` ${dim('[Esc] dismiss  [↑↓] scroll')}`;
  } else {
    commandBarText = ` ${dim('Press / for commands')}`;
  }
  commandBarText = padEnd(commandBarText, totalWidth - 2);
  output.push(gold(BOX.vertical) + commandBarText + gold(BOX.vertical));

  // ── Footer ──
  let footerText: string;
  if (ctx.commandMode) {
    footerText = ` ${dim('[Enter] execute  [Esc] cancel  [Tab] autocomplete')}`;
  } else if (ctx.searchMode) {
    footerText = ` ${gold('/')}${white(ctx.searchQuery)}${dim('█')}  ${dim('[Esc] cancel  [Enter] search')}`;
  } else if (ctx.helpVisible) {
    footerText = ` ${dim('↑↓/jk')} navigate  ${dim('Enter')} select  ${dim('Tab')} switch pane  ${dim('/')} search  ${dim('q')} quit`;
  } else {
    footerText = ` ${ctx.footerHint || dim('[h] help  •  [Tab] switch pane  •  [/] commands')}`;
  }
  footerText = padEnd(footerText, totalWidth - 2);
  output.push(gold(BOX.vertical) + footerText + gold(BOX.vertical));

  // ── Bottom border ──
  output.push(gold(BOX.bottomLeft + BOX.horizontal.repeat(totalWidth - 2) + BOX.bottomRight));
}

function renderNarrow(ctx: RenderContext, cols: number, rows: number, output: string[]): void {
  const w = cols;

  // Header
  output.push(gold(BOX.topLeft + BOX.horizontal.repeat(w - 2) + BOX.topRight));
  output.push(gold(BOX.vertical) + padEnd(goldBold(` OMO Suites v${VERSION}`), w - 2) + gold(BOX.vertical));
  output.push(gold(BOX.teeRight + BOX.horizontal.repeat(w - 2) + BOX.teeLeft));

  // Menu row (horizontal)
  let menuRow = ' ';
  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const short = MENU_ITEMS[i].slice(0, 3);
    if (ctx.menuIndex === i) {
      menuRow += bgGold(` ${short} `) + ' ';
    } else {
      menuRow += dim(` ${short} `) + ' ';
    }
  }
  output.push(gold(BOX.vertical) + padEnd(menuRow, w - 2) + gold(BOX.vertical));
  output.push(gold(BOX.teeRight + BOX.horizontal.repeat(w - 2) + BOX.teeLeft));

  // Content
  const contentHeight = rows - 7;
  for (let i = 0; i < contentHeight; i++) {
    let line: string;
    if (i === 0 && ctx.contentTitle) {
      line = ' ' + goldBold(ctx.contentTitle);
    } else {
      const idx = i - (ctx.contentTitle ? 1 : 0);
      if (idx >= 0 && idx < ctx.contentLines.length) {
        line = ' ' + ctx.contentLines[idx];
      } else {
        line = '';
      }
    }
    output.push(gold(BOX.vertical) + padEnd(truncate(line, w - 2), w - 2) + gold(BOX.vertical));
  }

  // Footer
  output.push(gold(BOX.teeRight + BOX.horizontal.repeat(w - 2) + BOX.teeLeft));
  const foot = ` ${dim('↑↓ nav  Enter sel  q quit')}`;
  output.push(gold(BOX.vertical) + padEnd(foot, w - 2) + gold(BOX.vertical));
  output.push(gold(BOX.bottomLeft + BOX.horizontal.repeat(w - 2) + BOX.bottomRight));
}
