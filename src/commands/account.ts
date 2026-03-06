import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { readConfig, addAccount, removeAccount, getAccounts, updateConfig } from '../core/config.ts';
import { encrypt, decrypt, maskKey, verifyPassword } from '../core/crypto.ts';
import { createTable, heading, success, fail, warn, info, icons, handleError, successBox, errorBox } from '../utils/ui.ts';

async function getMasterPassword(): Promise<string> {
  const config = await readConfig();
  if (!config.masterPasswordHash) {
    throw new Error('No master password set. Run `omocs init` first.');
  }
  const { password } = await inquirer.prompt([{
    type: 'password',
    name: 'password',
    message: 'Enter master password:',
    mask: '*',
  }]);
  if (!verifyPassword(password, config.masterPasswordHash)) {
    throw new Error('Invalid master password.');
  }
  return password;
}

export function registerAccountCommand(program: Command): void {
  const account = program
    .command('account')
    .description('Manage API provider accounts');

  // ─── account list ──────────────────────────────────────────────────
  account
    .command('list')
    .description('List all configured accounts')
    .action(async () => {
      try {
        heading('🔑 Configured Accounts');
        const accounts = await getAccounts();
        const providers = Object.keys(accounts);

        if (providers.length === 0) {
          warn('No accounts configured. Run `omocs account add` to add one.');
          return;
        }

        const rows: (string | number)[][] = [];
        for (const provider of providers) {
          for (const acc of accounts[provider]) {
            const statusIcon = acc.status === 'active' ? chalk.green('●')
              : acc.status === 'rate-limited' ? chalk.yellow('●')
              : chalk.red('●');
            rows.push([
              provider,
              acc.label,
              `${statusIcon} ${acc.status}`,
              acc.priority.toString(),
              maskKey(acc.key),
              acc.lastUsed || 'never',
            ]);
          }
        }

        console.log(createTable(
          ['Provider', 'Label', 'Status', 'Priority', 'Key', 'Last Used'],
          rows
        ));
        console.log(`\n  Total: ${chalk.bold(rows.length.toString())} account(s) across ${chalk.bold(providers.length.toString())} provider(s)\n`);
      } catch (error) {
        handleError(error);
      }
    });

  // ─── account add ───────────────────────────────────────────────────
  account
    .command('add')
    .description('Add a new API account')
    .option('-p, --provider <provider>', 'Provider name (anthropic, openai, google, etc.)')
    .option('-l, --label <label>', 'Account label')
    .action(async (options) => {
      try {
        const masterPassword = await getMasterPassword();

        let provider = options.provider;
        if (!provider) {
          const result = await inquirer.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Select provider:',
            choices: ['anthropic', 'openai', 'google', 'github', 'groq', 'openrouter', 'other'],
          }]);
          provider = result.provider;

          if (provider === 'other') {
            const { customProvider } = await inquirer.prompt([{
              type: 'input',
              name: 'customProvider',
              message: 'Enter provider name:',
              validate: (input: string) => input.length > 0 ? true : 'Provider name required',
            }]);
            provider = customProvider;
          }
        }

        let label = options.label;
        if (!label) {
          const result = await inquirer.prompt([{
            type: 'input',
            name: 'label',
            message: 'Account label:',
            default: 'default',
          }]);
          label = result.label;
        }

        const { apiKey } = await inquirer.prompt([{
          type: 'password',
          name: 'apiKey',
          message: `Enter API key for ${provider}:`,
          mask: '*',
          validate: (input: string) => input.length > 0 ? true : 'API key required',
        }]);

        const { priority } = await inquirer.prompt([{
          type: 'number',
          name: 'priority',
          message: 'Priority (1 = highest):',
          default: 1,
        }]);

        const spinner = ora('Encrypting and saving...').start();
        const encryptedKey = encrypt(apiKey, masterPassword);

        await addAccount(provider, {
          label,
          key: encryptedKey,
          priority: priority || 1,
          status: 'active',
        });

        spinner.succeed(chalk.green('Account added!'));
        success(`${provider}/${label} — encrypted and saved`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── account remove ────────────────────────────────────────────────
  account
    .command('remove')
    .description('Remove an API account')
    .argument('[provider]', 'Provider name')
    .argument('[label]', 'Account label')
    .action(async (provider?: string, label?: string) => {
      try {
        if (!provider || !label) {
          const accounts = await getAccounts();
          const choices: Array<{ name: string; value: { provider: string; label: string } }> = [];
          for (const [prov, accs] of Object.entries(accounts)) {
            for (const acc of accs) {
              choices.push({
                name: `${prov}/${acc.label} (${acc.status})`,
                value: { provider: prov, label: acc.label },
              });
            }
          }
          if (choices.length === 0) {
            warn('No accounts to remove.');
            return;
          }
          const { selected } = await inquirer.prompt([{
            type: 'list',
            name: 'selected',
            message: 'Select account to remove:',
            choices,
          }]);
          provider = selected.provider;
          label = selected.label;
        }

        const removed = await removeAccount(provider!, label!);
        if (removed) {
          success(`Removed ${provider}/${label}`);
        } else {
          fail(`Account ${provider}/${label} not found`);
        }
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── account rotate ───────────────────────────────────────────────
  account
    .command('rotate')
    .description('Rotate API key for an account')
    .argument('[provider]', 'Provider name')
    .argument('[label]', 'Account label')
    .action(async (provider?: string, label?: string) => {
      try {
        const masterPassword = await getMasterPassword();

        if (!provider || !label) {
          const accounts = await getAccounts();
          const choices: Array<{ name: string; value: { provider: string; label: string } }> = [];
          for (const [prov, accs] of Object.entries(accounts)) {
            for (const acc of accs) {
              choices.push({
                name: `${prov}/${acc.label}`,
                value: { provider: prov, label: acc.label },
              });
            }
          }
          if (choices.length === 0) {
            warn('No accounts to rotate.');
            return;
          }
          const { selected } = await inquirer.prompt([{
            type: 'list',
            name: 'selected',
            message: 'Select account to rotate:',
            choices,
          }]);
          provider = selected.provider;
          label = selected.label;
        }

        const { newKey } = await inquirer.prompt([{
          type: 'password',
          name: 'newKey',
          message: `Enter new API key for ${provider}/${label}:`,
          mask: '*',
          validate: (input: string) => input.length > 0 ? true : 'API key required',
        }]);

        const encryptedKey = encrypt(newKey, masterPassword);

        await updateConfig(config => {
          const accs = config.accounts[provider!];
          if (accs) {
            const acc = accs.find(a => a.label === label);
            if (acc) {
              acc.key = encryptedKey;
              acc.lastUsed = new Date().toISOString();
            }
          }
        });

        success(`API key rotated for ${provider}/${label}`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── account check ─────────────────────────────────────────────────
  account
    .command('check')
    .description('Check status of all accounts')
    .action(async () => {
      try {
        heading('🔍 Account Status Check');
        const config = await readConfig();
        const providers = Object.keys(config.accounts);

        if (providers.length === 0) {
          warn('No accounts configured.');
          return;
        }

        for (const provider of providers) {
          console.log(`\n  ${chalk.bold(provider)}:`);
          for (const acc of config.accounts[provider]) {
            const statusIcon = acc.status === 'active' ? icons.success
              : acc.status === 'rate-limited' ? icons.warn
              : icons.fail;
            console.log(`    ${statusIcon} ${acc.label} — priority: ${acc.priority}`);
            if (acc.lastError) {
              console.log(`      ${chalk.red('Last error:')} ${acc.lastError}`);
            }
          }
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });
}
