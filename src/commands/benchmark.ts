import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readOpenCodeConfig } from '../core/opencode.ts';
import { readConfig } from '../core/config.ts';
import { profiles, getProfile } from '../data/profiles.ts';
import { customProfilesStore } from '../core/store.ts';
import { heading, fail, info, icons, handleError, createTable, successBox } from '../utils/ui.ts';

const DEFAULT_PROMPT = 'Explain the concept of dependency injection in 3 sentences';

interface BenchmarkResult {
  model: string;
  responseTimeMs: number;
  outputLength: number;
  preview: string;
  error?: string;
}

async function queryModel(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number = 30000,
): Promise<BenchmarkResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        model,
        responseTimeMs: elapsed,
        outputLength: 0,
        preview: '',
        error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
      };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || '';
    const preview = content.length > 120 ? content.slice(0, 120) + '...' : content;

    return {
      model,
      responseTimeMs: elapsed,
      outputLength: content.length,
      preview,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return {
      model,
      responseTimeMs: elapsed,
      outputLength: 0,
      preview: '',
      error: message.includes('abort') ? 'Timeout' : message.slice(0, 100),
    };
  }
}

function formatTime(ms: number): string {
  if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

export function registerBenchmarkCommand(program: Command): void {
  program
    .command('benchmark')
    .description('Quick model comparison — send same prompt to multiple models')
    .argument('[prompt]', 'Prompt to send', DEFAULT_PROMPT)
    .option('--models <models>', 'Comma-separated list of models to compare')
    .option('--timeout <ms>', 'Timeout per request in ms', '30000')
    .action(async (prompt: string, options: { models?: string; timeout?: string }) => {
      try {
        heading('⚡ Model Benchmark');

        // Find provider config from opencode.json
        const ocResult = await readOpenCodeConfig();
        const ocConfig = ocResult?.config;

        if (!ocConfig) {
          fail('No opencode.json found. Run `omocs init` first.');
          return;
        }

        // Get provider settings
        const provider = ocConfig.provider as { baseURL?: string; apiKey?: string } | undefined;
        const baseURL = (provider?.baseURL as string) ||
                        (process.env.OPENAI_BASE_URL as string) ||
                        (process.env.OPENCODE_API_BASE as string);
        const apiKey = (provider?.apiKey as string) ||
                       (process.env.OPENAI_API_KEY as string) ||
                       (process.env.OPENCODE_API_KEY as string);

        if (!baseURL) {
          fail('No API base URL found. Configure provider in opencode.json or set OPENAI_BASE_URL.');
          return;
        }

        if (!apiKey) {
          fail('No API key found. Configure provider in opencode.json or set OPENAI_API_KEY.');
          return;
        }

        // Determine which models to benchmark
        let models: string[];

        if (options.models) {
          models = options.models.split(',').map(m => m.trim()).filter(Boolean);
        } else {
          // Use models from active profile
          const config = await readConfig();
          let activeProfile = getProfile(config.activeProfile);
          if (!activeProfile) {
            const custom = await customProfilesStore.read();
            activeProfile = custom.profiles[config.activeProfile] as any;
          }

          if (activeProfile) {
            // Get unique models from the profile's agents
            const modelSet = new Set<string>([
              activeProfile.agents.coder,
              activeProfile.agents.task,
              activeProfile.agents.title,
            ]);
            models = Array.from(modelSet).slice(0, 3);
          } else {
            // Fallback defaults
            models = ['claude-sonnet-4-6', 'gpt-5.3-codex'];
          }
        }

        if (models.length === 0) {
          fail('No models specified. Use --models flag or configure a profile.');
          return;
        }

        if (models.length > 5) {
          models = models.slice(0, 5);
          info(`Limiting to 5 models to keep benchmark manageable.`);
        }

        const timeoutMs = parseInt(options.timeout || '30000', 10);

        info(`Prompt: ${chalk.italic(`"${prompt}"`)}`);
        info(`Models: ${chalk.bold(models.join(', '))}`);
        info(`Timeout: ${formatTime(timeoutMs)} per model`);
        info(`API: ${chalk.gray(baseURL)}`);
        console.log('');

        // Run benchmarks sequentially to avoid rate limits
        const results: BenchmarkResult[] = [];

        for (const model of models) {
          const spinner = ora(`Testing ${chalk.bold(model)}...`).start();
          const result = await queryModel(baseURL, apiKey, model, prompt, timeoutMs);
          results.push(result);

          if (result.error) {
            spinner.fail(`${chalk.bold(model)}: ${chalk.red(result.error)} (${formatTime(result.responseTimeMs)})`);
          } else {
            spinner.succeed(`${chalk.bold(model)}: ${formatTime(result.responseTimeMs)} — ${result.outputLength} chars`);
          }
        }

        console.log('');

        // Results table
        heading('Results');

        const successResults = results.filter(r => !r.error);

        // Sort by response time (fastest first)
        const sorted = [...results].sort((a, b) => {
          if (a.error && !b.error) return 1;
          if (!a.error && b.error) return -1;
          return a.responseTimeMs - b.responseTimeMs;
        });

        const rows = sorted.map((r, i) => {
          const rank = r.error ? chalk.red('✗') : `#${i + 1}`;
          const time = r.error ? chalk.red(formatTime(r.responseTimeMs)) : formatTime(r.responseTimeMs);
          const chars = r.error ? chalk.red(r.error) : r.outputLength.toString();
          const status = r.error
            ? chalk.red('FAIL')
            : (i === 0 ? chalk.green('⚡ FASTEST') : chalk.gray('OK'));

          return [rank, r.model, time, chars, status];
        });

        console.log(createTable(
          ['Rank', 'Model', 'Response Time', 'Output Chars', 'Status'],
          rows,
        ));

        // Show fastest model
        if (successResults.length > 0) {
          const fastest = sorted.find(r => !r.error)!;
          console.log(`\n  ${icons.star} Fastest: ${chalk.bold.green(fastest.model)} (${formatTime(fastest.responseTimeMs)})`);
        }

        // Show response previews
        if (successResults.length > 0) {
          heading('Response Previews');
          for (const r of sorted.filter(r => !r.error)) {
            console.log(`  ${chalk.bold.cyan(r.model)}:`);
            console.log(`  ${chalk.gray(r.preview)}\n`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
