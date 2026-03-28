import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { heading, success, fail, warn, info, icons, handleError, successBox, infoBox } from '../utils/ui.ts';
import { readOpenCodeConfig } from '../core/opencode.ts';

// ─── Find package.json for version ──────────────────────────────────
function getVersion(): string {
  try {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 5; i++) {
      const candidate = resolve(dir, 'package.json');
      if (existsSync(candidate)) {
        return JSON.parse(readFileSync(candidate, 'utf-8')).version || '?';
      }
      dir = dirname(dir);
    }
  } catch {}
  return '?';
}

// ─── Mask API key ───────────────────────────────────────────────────
function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '...' + key.substring(key.length - 3);
}

// ─── Check if config is 1mr.tech ────────────────────────────────────
function is1mrTechProvider(config: Record<string, any>): boolean {
  const baseURL = config?.provider?.baseURL || '';
  return baseURL.includes('api.1mr.tech');
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show current configuration and provider status')
    .action(async () => {
      try {
        const version = getVersion();
        heading(`OMO Suites v${version}`);

        // Read opencode config
        const result = await readOpenCodeConfig();

        if (!result) {
          warn('No opencode.json found. Run `omocs init` to configure.');
          return;
        }

        const config = result.config as Record<string, any>;

        // Detect provider
        if (is1mrTechProvider(config)) {
          const apiKey = config.provider?.apiKey || '';
          const model = config.provider?.model || 'unknown';

          info(`Provider: ${chalk.bold.cyan('1mr.tech')}`);
          info(`API Key: ${chalk.bold(maskApiKey(apiKey))}`);
          info(`Default model: ${chalk.bold(model)}`);
          info(`Base URL: ${chalk.gray(config.provider?.baseURL)}`);
          info(`Config: ${chalk.gray(result.path)}`);

          // Fetch usage from API
          if (apiKey) {
            const spinner = ora('Fetching token usage from 1mr.tech...').start();

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 10000);

              const response = await fetchWithRetry('https://api.1mr.tech/v1/usage', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (response.ok) {
                const data = await response.json() as {
                  tokens_remaining?: number;
                  tokens_used?: number;
                  api_key_status?: string;
                };

                spinner.stop();

                const remaining = data.tokens_remaining || 0;
                const used = data.tokens_used || 0;
                const status = data.api_key_status || 'unknown';

                console.log('');
                successBox('1mr.tech Status', [
                  `${chalk.gray('Tokens remaining:')} ${chalk.bold.green(remaining.toLocaleString())}`,
                  `${chalk.gray('Tokens used:')}      ${chalk.bold(used.toLocaleString())}`,
                  `${chalk.gray('Status:')}           ${status === 'active' ? chalk.bold.green(status) : chalk.bold.yellow(status)}`,
                ].join('\n'));
              } else if (response.status === 401 || response.status === 403) {
                spinner.fail(chalk.red('Invalid or expired API key'));
                info(`Get a new key at ${chalk.cyan('https://1mr.tech')}`);
              } else {
                spinner.fail(chalk.red(`API returned status ${response.status}`));
              }
            } catch (err) {
              if ((err as Error).name === 'AbortError') {
                spinner.fail(chalk.yellow('API request timed out'));
              } else {
                spinner.fail(chalk.yellow('Could not reach 1mr.tech API'));
              }
            }
          }
        } else {
          // Non-1mr.tech provider
          const provider = config.provider?.name || config.provider || 'unknown';
          const model = config.model || config.provider?.model || 'unknown';

          info(`Provider: ${chalk.bold(String(provider))}`);
          info(`Model: ${chalk.bold(String(model))}`);
          info(`Config: ${chalk.gray(result.path)}`);

          // Check for oh-my-opencode.json
          const ohmyPath = resolve(process.cwd(), 'oh-my-opencode.json');
          if (existsSync(ohmyPath)) {
            try {
              const ohmyConfig = JSON.parse(readFileSync(ohmyPath, 'utf-8'));
              info(`Subscription: ${chalk.bold(ohmyConfig.subscription || 'unknown')}`);
            } catch {}
          }

          console.log('');
          info(`Run ${chalk.cyan('omocs doctor')} for a full health check.`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
