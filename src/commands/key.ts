import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir, hostname } from 'os';
import { createHash } from 'crypto';
import { heading, success, fail, info, successBox, errorBox, icons } from '../utils/ui.ts';
import { fetchWithRetry } from '../utils/network.ts';
import { findOpencodeConfig } from '../core/opencode.ts';
import { encrypt } from '../core/crypto.ts';

// ─── Machine-specific encryption key ─────────────────────────────────
function getMachineKey(): string {
  return createHash('sha256')
    .update(`omocs:${hostname()}:${homedir()}`)
    .digest('hex');
}

function encryptApiKey(apiKey: string): string {
  return encrypt(apiKey, getMachineKey());
}

// ─── Validate API key against 1mr.tech ───────────────────────────────
interface UsageResponse {
  tokens_remaining?: number;
  tokens_used?: number;
  api_key_status?: string;
}

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; tokensRemaining: number; error?: string }> {
  try {
    const response = await fetchWithRetry('https://api.1mr.tech/v1/usage', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeoutMs: 10000,
      retries: 2,
    });

    if (response.ok) {
      const data = await response.json() as UsageResponse;
      return { valid: true, tokensRemaining: data.tokens_remaining ?? 0 };
    } else if (response.status === 401 || response.status === 403) {
      return { valid: false, tokensRemaining: 0, error: 'Invalid API key' };
    } else {
      return { valid: false, tokensRemaining: 0, error: `API returned ${response.status}: ${response.statusText}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, tokensRemaining: 0, error: `Failed to reach 1mr.tech: ${msg}` };
  }
}

// ─── Write provider config to opencode.json ────────────────────────────
function writeOpencodeConfig(apiKey: string, encrypted: boolean): void {
  const configPath = findOpencodeConfig();
  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // Start fresh if corrupt
    }
  }

  config.provider = {
    name: 'openai-compatible',
    model: 'claude-sonnet-4-6',
    baseURL: 'https://api.1mr.tech/v1',
    apiKey: encrypted ? encryptApiKey(apiKey) : apiKey,
    _encrypted: encrypted,
  };

  // Ensure plugins array
  if (!config.plugin) config.plugin = [];
  if (!Array.isArray(config.plugin)) config.plugin = [];

  const pluginsToAdd = ['oh-my-opencode', 'omocs'];
  for (const plugin of pluginsToAdd) {
    if (!config.plugin.includes(plugin) && !config.plugin.some((p: unknown) => typeof p === 'string' && p.includes('omocs'))) {
      config.plugin.push(plugin);
    }
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ─── Write oh-my-opencode.json ───────────────────────────────────────
function writeOhMyOpencodeConfig(apiKey: string, encrypted: boolean): void {
  const configDir = resolve(homedir(), '.omocs');
  const configPath = resolve(configDir, 'oh-my-opencode.json');

  const config = {
    subscription: 'custom',
    provider: {
      baseURL: 'https://api.1mr.tech/v1',
      apiKey: encrypted ? encryptApiKey(apiKey) : apiKey,
      _encrypted: encrypted,
    },
    agents: {
      sisyphus: { enabled: true, model: 'claude-opus-4-6' },
      prometheus: { enabled: true },
      atlas: { enabled: true },
      metis: { enabled: true },
      momus: { enabled: true },
      hephaestus: { enabled: true },
      oracle: { enabled: true },
      librarian: { enabled: true },
    },
  };

  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ─── Read current provider from opencode.json ─────────────────────────
function readCurrentProvider(): { apiKey: string; encrypted: boolean; baseURL: string; model: string } | null {
  try {
    const configPath = findOpencodeConfig();
    if (!existsSync(configPath)) return null;

    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const provider = config.provider as Record<string, unknown> | undefined;

    if (!provider) return null;

    return {
      apiKey: String(provider.apiKey ?? ''),
      encrypted: Boolean(provider._encrypted ?? false),
      baseURL: String(provider.baseURL ?? ''),
      model: String(provider.model ?? ''),
    };
  } catch {
    return null;
  }
}

// ─── Register command ────────────────────────────────────────────────
export function registerKeyCommand(program: Command): void {
  const key = program
    .command('key')
    .description('Manage 1mr.tech API keys');

  // ─── key set ──────────────────────────────────────────────────────
  key
    .command('set')
    .description('Set 1mr.tech API key (validates, then writes to opencode.json + ~/.omocs/oh-my-opencode.json)')
    .argument('<apikey>', '1mr.tech API key')
    .action(async (apiKey: string) => {
      if (!apiKey || apiKey.trim().length === 0) {
        fail('API key is required.');
        console.log(chalk.gray('  Usage: omocs key set <apikey>'));
        process.exit(1);
      }

      apiKey = apiKey.trim();

      // Step 1: Validate
      const spinner = ora('Validating API key with 1mr.tech...').start();

      const result = await validateApiKey(apiKey);

      if (!result.valid) {
        spinner.fail(chalk.red(`Invalid API key: ${result.error}`));
        console.log(chalk.gray('  Get your key at https://1mr.tech\n'));
        process.exit(1);
      }

      spinner.succeed(chalk.green('API key valid!'));

      // Step 2: Write configs
      const writeSpinner = ora('Writing configuration...').start();

      try {
        writeOpencodeConfig(apiKey, true);
        writeOhMyOpencodeConfig(apiKey, true);
        writeSpinner.succeed(chalk.green('Configuration written!'));
      } catch (err) {
        writeSpinner.fail(chalk.red('Failed to write configuration'));
        const msg = err instanceof Error ? err.message : String(err);
        fail(`Error: ${msg}`);
        process.exit(1);
      }

      // Step 3: Print balance
      const balance = result.tokensRemaining;
      const balanceFormatted = balance.toLocaleString();

      const isLow = balance > 0 && balance < 50000;

      console.log('');
      console.log(
        boxen(
          [
            `${icons.check} ${chalk.bold.green('1mr.tech API key configured!')}`,
            ``,
            `  Model:     ${chalk.bold('claude-sonnet-4-6')}`,
            `  Balance:   ${isLow ? chalk.yellow(balanceFormatted) : chalk.green(balanceFormatted)} tokens`,
            ``,
            `  opencode.json:          ${chalk.gray('~/.config/opencode/opencode.json')}`,
            `  oh-my-opencode.json:    ${chalk.gray('~/.omocs/oh-my-opencode.json')}`,
            ``,
            `  Run ${chalk.cyan('opencode')} to start coding!`,
          ].join('\n'),
          {
            title: chalk.bold.green('Key Set'),
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
      console.log('');
    });

  // ─── key status ───────────────────────────────────────────────────
  key
    .command('status')
    .description('Check current 1mr.tech API key status and token balance')
    .action(async () => {
      const provider = readCurrentProvider();

      if (!provider) {
        info('No 1mr.tech provider configured in opencode.json.');
        console.log(chalk.gray('  Run `omocs key set <apikey>` to configure.\n'));
        return;
      }

      heading('🔑 1mr.tech Status');

      const hasEncrypted = provider.encrypted;
      const maskedKey = hasEncrypted
        ? provider.apiKey.length > 8
          ? provider.apiKey.substring(0, 6) + '••••' + provider.apiKey.substring(provider.apiKey.length - 4)
          : '••••••••'
        : provider.apiKey.substring(0, 4) + '••••••••••' + provider.apiKey.substring(provider.apiKey.length - 4);

      console.log(`  Model:     ${chalk.bold(provider.model || 'claude-sonnet-4-6')}`);
      console.log(`  Base URL:  ${chalk.gray(provider.baseURL || 'https://api.1mr.tech/v1')}`);
      console.log(`  API Key:   ${chalk.gray(maskedKey)} ${hasEncrypted ? chalk.green('[encrypted]') : chalk.yellow('[plaintext]')}`);
      console.log('');

      // Decrypt if needed for API call
      let rawKey = provider.apiKey;
      if (provider.encrypted) {
        try {
          const { decrypt } = await import('../core/crypto.ts');
          rawKey = decrypt(provider.apiKey, getMachineKey());
        } catch {
          fail('Could not decrypt API key. Machine key may have changed.');
          console.log(chalk.gray('  Run `omocs key set <apikey>` to re-configure.\n'));
          process.exit(1);
        }
      }

      const spinner = ora('Checking token balance...').start();
      const result = await validateApiKey(rawKey);

      if (!result.valid) {
        spinner.fail(chalk.red(`API key invalid: ${result.error}`));
        console.log(chalk.gray('  Run `omocs key set <apikey>` to update.\n'));
        process.exit(1);
      }

      spinner.succeed(chalk.green('Token balance retrieved'));

      const balance = result.tokensRemaining;
      const balanceFormatted = balance.toLocaleString();

      console.log('');
      console.log(
        boxen(
          [
            `  ${chalk.bold('Token Balance')}:  ${balance > 0 ? chalk.green(balanceFormatted) : chalk.red('0')} tokens`,
            ``,
            balance > 0 && balance < 50000
              ? `  ${chalk.yellow('⚠ Running low — consider topping up at https://1mr.tech')}`
              : '',
          ].filter(Boolean).join('\n'),
          {
            padding: 1,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: balance > 0 && balance < 50000 ? 'yellow' : 'green',
          }
        )
      );
      console.log('');
    });
}

// ─── Inline boxen (avoid extra dep) ──────────────────────────────────
function boxen(content: string, opts: {
  title?: string;
  padding?: number;
  margin?: { top?: number; bottom?: number; left?: number; right?: number };
  borderStyle?: string;
  borderColor?: string;
}): string {
  // Use chalk + manual box for simplicity (avoids boxen dep)
  const pad = opts.padding ?? 1;
  const padStr = ' '.repeat(pad);
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length));
  const borderColor = opts.borderColor === 'green' ? '\x1b[32m'
    : opts.borderColor === 'yellow' ? '\x1b[33m'
    : '\x1b[36m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  let top = `${borderColor}╭${'─'.repeat(maxLen + pad * 2 + 2)}${reset}`;
  if (opts.title) {
    const titlePad = Math.floor((maxLen + pad * 2 + 2 - opts.title.length - 2) / 2);
    top = `${borderColor}╭${'─'.repeat(titlePad)} ${bold}${opts.title}${reset} ${'─'.repeat(maxLen + pad * 2 + 2 - titlePad - opts.title.length - 3)}${reset}`;
  }

  const bottom = `${borderColor}╰${'─'.repeat(maxLen + pad * 2 + 2)}${reset}`;

  const middle = lines.map(line => {
    const spaces = maxLen + pad * 2 + 2 - line.length;
    return `${borderColor}│${reset}${padStr}${line}${' '.repeat(spaces - pad * 2)}${borderColor}│${reset}`;
  });

  return [top, ...middle, bottom].join('\n');
}
