import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createTable, heading, success, fail, warn, info, icons, handleError, infoBox, successBox } from '../utils/ui.ts';

interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

// Cost estimates per 1M tokens (rough approximations)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-4-opus': { input: 15, output: 75 },
  'claude-4-sonnet': { input: 3, output: 15 },
  'claude-3.5-haiku': { input: 0.25, output: 1.25 },
  'gemini-2.5': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'default': { input: 3, output: 15 },
};

function findDatabase(): string | null {
  const locations = [
    join(process.cwd(), '.opencode', 'data.db'),
    join(homedir(), '.opencode', 'data.db'),
    join(homedir(), '.config', 'opencode', 'data.db'),
  ];

  for (const loc of locations) {
    if (existsSync(loc)) return loc;
  }
  return null;
}

function getDateRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Today' };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Last 7 Days' };
    }
    case 'month': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Last 30 Days' };
    }
    default: {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Today' };
    }
  }
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS['default'];
  return (inputTokens / 1_000_000 * costs.input) + (outputTokens / 1_000_000 * costs.output);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── TUI Bar Chart ──────────────────────────────────────────────────
function renderBarChart(data: { label: string; value: number; color?: typeof chalk.green }[], maxWidth: number = 40): string {
  if (data.length === 0) return '  (no data)';

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const maxLabelLen = Math.max(...data.map(d => d.label.length), 5);
  const lines: string[] = [];

  for (const item of data) {
    const barLen = Math.round((item.value / maxValue) * maxWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(maxWidth - barLen);
    const colorFn = item.color || chalk.cyan;
    const paddedLabel = item.label.padEnd(maxLabelLen);
    lines.push(`  ${chalk.gray(paddedLabel)} ${colorFn(bar)} ${chalk.bold(String(item.value))}`);
  }

  return lines.join('\n');
}

// ─── Aggregated Stats Store ─────────────────────────────────────────
interface AggregatedStats {
  lastUpdated: string;
  sessions: {
    total: number;
    byDate: Record<string, number>;
  };
  agents: Record<string, {
    invocations: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgResponseTimeMs: number;
    lastUsed: string;
  }>;
}

function getStatsPath(): string {
  return join(homedir(), '.omocs', 'stats.json');
}

function readAggregatedStats(): AggregatedStats {
  const path = getStatsPath();
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {}
  }
  return {
    lastUpdated: new Date().toISOString(),
    sessions: { total: 0, byDate: {} },
    agents: {},
  };
}

function writeAggregatedStats(stats: AggregatedStats): void {
  const dir = join(homedir(), '.omocs');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2));
}

// ─── Dashboard View ─────────────────────────────────────────────────
function showDashboard(lastN?: number): void {
  const stats = readAggregatedStats();

  heading('📊 Agent Analytics Dashboard');

  if (Object.keys(stats.agents).length === 0) {
    infoBox('No Agent Data Yet', [
      'Agent analytics are populated from OpenCode session data.',
      '',
      'To collect data:',
      `  1. Run ${chalk.cyan('opencode')} and work on some tasks`,
      `  2. Run ${chalk.cyan('omocs stats --sync')} to import session data`,
      '',
      `Stats file: ${chalk.gray(getStatsPath())}`,
    ].join('\n'));
    return;
  }

  // Agent usage chart
  const agentEntries = Object.entries(stats.agents)
    .sort((a, b) => b[1].invocations - a[1].invocations)
    .slice(0, lastN || 15);

  console.log('');
  heading('Most Used Agents');
  console.log(renderBarChart(
    agentEntries.map(([name, data]) => ({
      label: name,
      value: data.invocations,
      color: chalk.green,
    })),
    35,
  ));

  // Token usage chart
  console.log('');
  heading('Token Usage by Agent');
  console.log(renderBarChart(
    agentEntries.map(([name, data]) => ({
      label: name,
      value: data.totalInputTokens + data.totalOutputTokens,
      color: chalk.blue,
    })),
    35,
  ));

  // Response time chart
  const withTiming = agentEntries.filter(([_, d]) => d.avgResponseTimeMs > 0);
  if (withTiming.length > 0) {
    console.log('');
    heading('Avg Response Time (ms)');
    console.log(renderBarChart(
      withTiming.map(([name, data]) => ({
        label: name,
        value: Math.round(data.avgResponseTimeMs),
        color: chalk.yellow,
      })),
      35,
    ));
  }

  // Summary table
  console.log('');
  heading('Agent Summary');

  const rows = agentEntries.map(([name, data]) => [
    name,
    data.invocations,
    formatTokens(data.totalInputTokens),
    formatTokens(data.totalOutputTokens),
    data.avgResponseTimeMs > 0 ? `${Math.round(data.avgResponseTimeMs)}ms` : '—',
    data.lastUsed ? data.lastUsed.split('T')[0] : '—',
  ]);

  console.log(createTable(
    ['Agent', 'Calls', 'Input', 'Output', 'Avg Time', 'Last Used'],
    rows,
  ));

  console.log('');
  info(`Last updated: ${chalk.gray(stats.lastUpdated)}`);
  info(`Stats file: ${chalk.gray(getStatsPath())}`);
}

export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Token usage statistics and agent analytics dashboard')
    .argument('[period]', 'Time period: today, week, month', 'today')
    .option('--export <file>', 'Export to CSV file')
    .option('--db <path>', 'Path to OpenCode database')
    .option('--dashboard', 'Show agent analytics dashboard with TUI charts')
    .option('--last <n>', 'Limit to last N agents (dashboard mode)')
    .option('--sync', 'Sync session data to aggregated stats')
    .action(async (period: string, options: { export?: string; db?: string; dashboard?: boolean; last?: string; sync?: boolean }) => {
      try {
        // Dashboard mode
        if (options.dashboard) {
          showDashboard(options.last ? parseInt(options.last, 10) : undefined);
          return;
        }

        heading('📊 Usage Statistics');

        const dbPath = options.db || findDatabase();

        if (!dbPath) {
          warn('OpenCode database not found.');
          info('Expected at: .opencode/data.db');
          info('Run OpenCode at least once to generate the database.');
          info('Or specify path: omocs stats --db /path/to/data.db');

          // Show placeholder stats
          infoBox('No Data Available', [
            'OpenCode database not found in any of:',
            '  • .opencode/data.db (current directory)',
            '  • ~/.opencode/data.db',
            '  • ~/.config/opencode/data.db',
            '',
            `Run ${chalk.cyan('opencode')} to create sessions, then check stats.`,
            '',
            `Try ${chalk.cyan('omocs stats --dashboard')} for agent analytics.`,
          ].join('\n'));
          return;
        }

        const spinner = ora('Reading database...').start();

        try {
          let Database: any;
          try {
            Database = (await import('better-sqlite3')).default;
          } catch {
            spinner.stop();
            warn('better-sqlite3 is not installed (optional dependency).');
            info('Install it with: npm install -g better-sqlite3');
            info('Stats requires SQLite support to read OpenCode\'s database.');
            return;
          }
          const db = new Database(dbPath, { readonly: true });

          const { start, end, label } = getDateRange(period);
          const startStr = start.toISOString();
          const endStr = end.toISOString();

          // Count sessions
          const sessionCount = db.prepare(
            'SELECT COUNT(*) as count FROM sessions WHERE created_at >= ? AND created_at <= ?'
          ).get(startStr, endStr) as { count: number } | null;

          // Get message stats
          const messageStats = db.prepare(`
            SELECT
              COUNT(*) as message_count,
              COALESCE(SUM(input_tokens), 0) as total_input,
              COALESCE(SUM(output_tokens), 0) as total_output
            FROM messages
            WHERE created_at >= ? AND created_at <= ?
          `).get(startStr, endStr) as { message_count: number; total_input: number; total_output: number } | null;

          // Get daily breakdown
          const dailyStats = db.prepare(`
            SELECT
              DATE(created_at) as date,
              COUNT(*) as messages,
              COALESCE(SUM(input_tokens), 0) as input_tokens,
              COALESCE(SUM(output_tokens), 0) as output_tokens
            FROM messages
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
          `).all(startStr, endStr) as Array<{ date: string; messages: number; input_tokens: number; output_tokens: number }>;

          db.close();
          spinner.stop();

          const sessions = sessionCount?.count || 0;
          const inputTokens = messageStats?.total_input || 0;
          const outputTokens = messageStats?.total_output || 0;
          const totalTokens = inputTokens + outputTokens;
          const messages = messageStats?.message_count || 0;
          const cost = estimateCost(inputTokens, outputTokens);

          // Summary
          successBox(`📊 Stats — ${label}`, [
            `${chalk.gray('Sessions:')}     ${chalk.bold(sessions.toString())}`,
            `${chalk.gray('Messages:')}     ${chalk.bold(messages.toString())}`,
            `${chalk.gray('Input Tokens:')} ${chalk.bold(formatTokens(inputTokens))}`,
            `${chalk.gray('Output Tokens:')}${chalk.bold(formatTokens(outputTokens))}`,
            `${chalk.gray('Total Tokens:')} ${chalk.bold(formatTokens(totalTokens))}`,
            `${chalk.gray('Est. Cost:')}    ${chalk.bold.green('$' + cost.toFixed(2))}`,
          ].join('\n'));

          // TUI bar chart for daily tokens
          if (dailyStats.length > 1) {
            console.log('');
            heading('Daily Token Usage');
            console.log(renderBarChart(
              dailyStats.slice(0, 10).reverse().map(d => ({
                label: d.date,
                value: d.input_tokens + d.output_tokens,
                color: chalk.cyan,
              })),
              35,
            ));
          }

          // Daily breakdown table
          if (dailyStats.length > 0) {
            console.log('');
            heading('Daily Breakdown');
            const rows = dailyStats.map(d => [
              d.date,
              d.messages,
              formatTokens(d.input_tokens),
              formatTokens(d.output_tokens),
              formatTokens(d.input_tokens + d.output_tokens),
              '$' + estimateCost(d.input_tokens, d.output_tokens).toFixed(2),
            ]);
            console.log(createTable(
              ['Date', 'Messages', 'Input', 'Output', 'Total', 'Est. Cost'],
              rows
            ));
          }

          // Sync stats
          if (options.sync) {
            const aggregated = readAggregatedStats();
            aggregated.sessions.total = sessions;
            for (const d of dailyStats) {
              aggregated.sessions.byDate[d.date] = d.messages;
            }
            aggregated.lastUpdated = new Date().toISOString();
            writeAggregatedStats(aggregated);
            console.log('');
            success(`Stats synced to ${getStatsPath()}`);
          }

          // Export
          if (options.export) {
            const csvLines = [
              'date,messages,input_tokens,output_tokens,total_tokens,estimated_cost',
              ...dailyStats.map(d =>
                `${d.date},${d.messages},${d.input_tokens},${d.output_tokens},${d.input_tokens + d.output_tokens},${estimateCost(d.input_tokens, d.output_tokens).toFixed(2)}`
              ),
            ];
            writeFileSync(options.export, csvLines.join('\n'));
            success(`Exported to ${options.export}`);
          }

          // Hint about dashboard
          console.log('');
          info(`Try ${chalk.cyan('omocs stats --dashboard')} for agent analytics view.`);

        } catch (dbError) {
          spinner.stop();
          if ((dbError as Error).message?.includes('not a database')) {
            fail('File is not a valid SQLite database.');
          } else if ((dbError as Error).message?.includes('no such table')) {
            warn('Database exists but has no sessions/messages tables.');
            info('This may be a different version of OpenCode.');
          } else {
            throw dbError;
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
