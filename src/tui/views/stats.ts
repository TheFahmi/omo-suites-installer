import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { gold, goldBold, dim, bold, white, green, cyan, yellow, gray } from '../utils.ts';

export interface StatsViewState {
  loaded: boolean;
  data: StatsData | null;
}

interface StatsData {
  totalTokens: number;
  totalCost: number;
  sessions: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  lastUpdated?: string;
}

export function initialStatsState(): StatsViewState {
  return { loaded: false, data: null };
}

export async function loadStats(state: StatsViewState): Promise<void> {
  const statsPath = join(homedir(), '.omocs', 'stats.json');

  if (!existsSync(statsPath)) {
    state.data = null;
    state.loaded = true;
    return;
  }

  try {
    const file = Bun.file(statsPath);
    const text = await file.text();
    state.data = JSON.parse(text);
    state.loaded = true;
  } catch {
    state.data = null;
    state.loaded = true;
  }
}

export function renderStats(state: StatsViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  if (!state.loaded) {
    lines.push(dim('Loading stats...'));
    return { lines, title: '📊 Stats', hint: '' };
  }

  if (!state.data) {
    lines.push('');
    lines.push(dim('  📊 No usage data yet.'));
    lines.push('');
    lines.push(dim('  Stats are collected when you use omocs'));
    lines.push(dim('  with OpenCode. Start a coding session'));
    lines.push(dim('  and check back later!'));
    lines.push('');
    lines.push(dim(`  Stats file: ~/.omocs/stats.json`));

    return { lines, title: '📊 Stats', hint: dim('No data available') };
  }

  lines.push(`${bold('Total Tokens:')}  ${white(formatNumber(state.data.totalTokens))}`);
  lines.push(`${bold('Total Cost:')}    ${green('$' + state.data.totalCost.toFixed(4))}`);
  lines.push(`${bold('Sessions:')}      ${white(String(state.data.sessions))}`);

  if (state.data.lastUpdated) {
    lines.push(`${bold('Last Updated:')} ${dim(state.data.lastUpdated)}`);
  }

  if (state.data.byModel && Object.keys(state.data.byModel).length > 0) {
    lines.push('');
    lines.push(goldBold('Usage by Model:'));
    lines.push(gold('─'.repeat(50)));

    for (const [model, usage] of Object.entries(state.data.byModel)) {
      lines.push(
        `  ${white(model.padEnd(28))} ${dim(formatNumber(usage.tokens).padEnd(12))} ${green('$' + usage.cost.toFixed(4))}`
      );
    }
  }

  return {
    lines,
    title: '📊 Stats',
    hint: dim('[r] refresh'),
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
