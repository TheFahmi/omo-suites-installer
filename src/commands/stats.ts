import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
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

export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Token usage statistics')
    .argument('[period]', 'Time period: today, week, month', 'today')
    .option('--export <file>', 'Export to CSV file')
    .option('--db <path>', 'Path to OpenCode database')
    .action(async (period: string, options) => {
      try {
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
          ].join('\n'));
          return;
        }

        const spinner = ora('Reading database...').start();

        try {
          const { Database } = await import('bun:sqlite');
          const db = new Database(dbPath, { readonly: true });

          const { start, end, label } = getDateRange(period);
          const startStr = start.toISOString();
          const endStr = end.toISOString();

          // Count sessions
          const sessionCount = db.query(
            'SELECT COUNT(*) as count FROM sessions WHERE created_at >= ? AND created_at <= ?'
          ).get(startStr, endStr) as { count: number } | null;

          // Get message stats
          const messageStats = db.query(`
            SELECT
              COUNT(*) as message_count,
              COALESCE(SUM(input_tokens), 0) as total_input,
              COALESCE(SUM(output_tokens), 0) as total_output
            FROM messages
            WHERE created_at >= ? AND created_at <= ?
          `).get(startStr, endStr) as { message_count: number; total_input: number; total_output: number } | null;

          // Get daily breakdown
          const dailyStats = db.query(`
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

          // Daily breakdown
          if (dailyStats.length > 0) {
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

          // Export
          if (options.export) {
            const csvLines = [
              'date,messages,input_tokens,output_tokens,total_tokens,estimated_cost',
              ...dailyStats.map(d =>
                `${d.date},${d.messages},${d.input_tokens},${d.output_tokens},${d.input_tokens + d.output_tokens},${estimateCost(d.input_tokens, d.output_tokens).toFixed(2)}`
              ),
            ];
            await Bun.write(options.export, csvLines.join('\n'));
            success(`Exported to ${options.export}`);
          }

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
