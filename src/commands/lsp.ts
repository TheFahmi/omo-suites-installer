import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { lspServers, listLspKeys, getLspServer } from '../data/lsp-registry.ts';
import { detectStack, suggestLSPs } from '../utils/detect.ts';
import { commandExists, run } from '../utils/shell.ts';
import { addLspToConfig, readOpenCodeConfig } from '../core/opencode.ts';
import { createTable, heading, success, fail, warn, info, icons, handleError } from '../utils/ui.ts';

export function registerLspCommand(program: Command): void {
  const lsp = program
    .command('lsp')
    .description('LSP server management');

  // ─── lsp detect ────────────────────────────────────────────────────
  lsp
    .command('detect')
    .description('Detect project stack and suggest LSP servers')
    .option('-d, --dir <directory>', 'Directory to scan', process.cwd())
    .action(async (options) => {
      try {
        heading('🔍 Project Stack Detection');

        const spinner = ora('Scanning project...').start();
        const stack = detectStack(options.dir);
        spinner.stop();

        if (stack.languages.length > 0) {
          info(`Languages: ${chalk.bold(stack.languages.join(', '))}`);
        }
        if (stack.frameworks.length > 0) {
          info(`Frameworks: ${chalk.bold(stack.frameworks.join(', '))}`);
        }
        if (stack.tools.length > 0) {
          info(`Tools: ${chalk.bold(stack.tools.join(', '))}`);
        }
        if (stack.packageManager) {
          info(`Package Manager: ${chalk.bold(stack.packageManager)}`);
        }

        const suggested = suggestLSPs(stack);
        if (suggested.length > 0) {
          heading('Suggested LSP Servers');
          for (const key of suggested) {
            const server = getLspServer(key);
            if (server) {
              const installed = await commandExists(server.command);
              const status = installed ? chalk.green('installed') : chalk.yellow('not installed');
              console.log(`  ${installed ? icons.success : icons.warn} ${chalk.bold(server.name)} [${status}]`);
              if (!installed) {
                console.log(`    ${chalk.gray('Install:')} ${server.install}`);
              }
            }
          }
        } else {
          info('No specific LSP servers suggested for this project.');
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });

  // ─── lsp install ───────────────────────────────────────────────────
  lsp
    .command('install')
    .description('Install an LSP server')
    .argument('<server>', 'LSP server key (typescript, python, go, etc.)')
    .option('--config', 'Also add to .opencode.json')
    .action(async (serverKey: string, options) => {
      try {
        const server = getLspServer(serverKey);
        if (!server) {
          fail(`Unknown LSP server: ${serverKey}`);
          info(`Available: ${listLspKeys().join(', ')}`);
          return;
        }

        // Check if already installed
        const alreadyInstalled = await commandExists(server.command);
        if (alreadyInstalled) {
          success(`${server.name} is already installed`);
        } else {
          const spinner = ora(`Installing ${server.name}...`).start();
          const parts = server.install.split(' ');
          const result = await run(parts[0], parts.slice(1));
          if (result.success) {
            spinner.succeed(chalk.green(`${server.name} installed!`));
          } else {
            spinner.fail(chalk.red(`Failed to install ${server.name}`));
            if (result.stderr) {
              console.log(chalk.gray(`  Error: ${result.stderr}`));
            }
            console.log(chalk.gray(`  Manual install: ${server.install}`));
            return;
          }
        }

        if (options.config) {
          const configSpinner = ora('Adding to .opencode.json...').start();
          await addLspToConfig(serverKey, server.command, server.args);
          configSpinner.succeed(chalk.green('Added to .opencode.json'));
        }
      } catch (error) {
        handleError(error);
      }
    });

  // ─── lsp status ────────────────────────────────────────────────────
  lsp
    .command('status')
    .description('Check installation status of all LSP servers')
    .action(async () => {
      try {
        heading('📡 LSP Server Status');

        const rows: (string | number)[][] = [];
        const spinner = ora('Checking LSP servers...').start();

        for (const [key, server] of Object.entries(lspServers)) {
          const installed = await commandExists(server.command);
          rows.push([
            key,
            server.name,
            installed ? chalk.green('● installed') : chalk.red('● not installed'),
            server.command,
            server.detect.join(', '),
          ]);
        }

        spinner.stop();

        // Check which are in .opencode.json
        const ocConfig = await readOpenCodeConfig();
        const configuredLsps = ocConfig?.config?.lsp ? Object.keys(ocConfig.config.lsp) : [];

        console.log(createTable(
          ['Key', 'Name', 'Status', 'Command', 'Detect Files'],
          rows
        ));

        if (configuredLsps.length > 0) {
          info(`Configured in .opencode.json: ${chalk.bold(configuredLsps.join(', '))}`);
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });
}
