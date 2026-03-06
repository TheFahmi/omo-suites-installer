import {
  gold, goldBold, dim, bold, white, green, red, cyan, gray, bgGold,
  BOX, getTerminalSize, padEnd, stripAnsi, centerText, truncate,
} from './utils.ts';

const VERSION = '1.1.0';

export const MENU_ITEMS = ['Profile', 'Agents', 'MCP', 'LSP', 'Doctor', 'Stats'] as const;
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
  const menuWidth = 14;
  const contentWidth = cols - menuWidth - 3; // 3 for borders
  const totalWidth = cols;
  const contentHeight = rows - 5; // header (2) + footer (2) + bottom border

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
    if (i === 0 && ctx.contentTitle) {
      contentCell = ' ' + goldBold(truncate(ctx.contentTitle, contentWidth - 2));
      contentCell = padEnd(contentCell, contentWidth);
    } else if (i === 1 && ctx.contentTitle) {
      contentCell = ' ' + gold(BOX.horizontal.repeat(Math.min(stripAnsi(ctx.contentTitle).length, contentWidth - 2)));
      contentCell = padEnd(contentCell, contentWidth);
    } else {
      const lineIdx = i - (ctx.contentTitle ? 2 : 0);
      if (lineIdx >= 0 && lineIdx < ctx.contentLines.length) {
        contentCell = ' ' + truncate(ctx.contentLines[lineIdx], contentWidth - 2);
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

  // ── Footer divider ──
  output.push(
    gold(BOX.teeRight) +
    gold(BOX.horizontal.repeat(menuWidth)) +
    gold(BOX.teeUp) +
    gold(BOX.horizontal.repeat(contentWidth)) +
    gold(BOX.teeLeft)
  );

  // ── Footer ──
  let footerText: string;
  if (ctx.searchMode) {
    footerText = ` ${gold('/')}${white(ctx.searchQuery)}${dim('█')}  ${dim('[Esc] cancel  [Enter] search')}`;
  } else if (ctx.helpVisible) {
    footerText = ` ${dim('↑↓/jk')} navigate  ${dim('Enter')} select  ${dim('Tab')} switch pane  ${dim('/')} search  ${dim('q')} quit`;
  } else {
    footerText = ` ${ctx.footerHint || dim('[h] help  •  [Tab] switch pane')}`;
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
