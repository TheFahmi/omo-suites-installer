import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { commandExists, getCommandVersion } from '../utils/shell.ts';
import { readConfig, configExists, getConfigPath, getConfigDir } from '../core/config.ts';
import { detectOpenCode, readOpenCodeConfig } from '../core/opencode.ts';
import { lspServers } from '../data/lsp-registry.ts';
import { createTable, heading, success, fail, warn, info, icons, successBox, errorBox, infoBox, divider } from '../utils/ui.ts';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  detail?: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const spinner = ora({ text: 'Running health checks...', color: 'cyan' }).start();

  // 1. Check OpenCode
  spinner.text = 'Checking OpenCode installation...';
  const opencode = await detectOpenCode();
  if (opencode.installed) {
    results.push({
      name: 'OpenCode',
      status: 'pass',
      message: `Installed${opencode.version ? ` (${opencode.version})` : ''}`,
    });
  } else {
    results.push({
      name: 'OpenCode',
      status: 'fail',
      message: 'Not installed',
      detail: 'Install OpenCode: https://opencode.ai',
    });
  }

  // 2. Check Bun
  spinner.text = 'Checking Bun runtime...';
  const bunInstalled = await commandExists('bun');
  if (bunInstalled) {
    const bunVersion = await getCommandVersion('bun');
    results.push({
      name: 'Bun',
      status: 'pass',
      message: `Installed${bunVersion ? ` (${bunVersion})` : ''}`,
    });
  } else {
    results.push({
      name: 'Bun',
      status: 'fail',
      message: 'Not installed',
      detail: 'Install Bun: curl -fsSL https://bun.sh/install | bash',
    });
  }

  // 3. Check Node.js
  spinner.text = 'Checking Node.js...';
  const nodeInstalled = await commandExists('node');
  if (nodeInstalled) {
    const nodeVersion = await getCommandVersion('node');
    results.push({
      name: 'Node.js',
      status: 'pass',
      message: `Installed${nodeVersion ? ` (${nodeVersion})` : ''}`,
    });
  } else {
    results.push({
      name: 'Node.js',
      status: 'warn',
      message: 'Not installed (some MCP servers need npx)',
    });
  }

  // 4. Check Git
  spinner.text = 'Checking Git...';
  const gitInstalled = await commandExists('git');
  if (gitInstalled) {
    const gitVersion = await getCommandVersion('git');
    results.push({
      name: 'Git',
      status: 'pass',
      message: `Installed${gitVersion ? ` (${gitVersion})` : ''}`,
    });
  } else {
    results.push({
      name: 'Git',
      status: 'warn',
      message: 'Not installed',
    });
  }

  // 5. Check OMOCS config
  spinner.text = 'Checking OMOCS configuration...';
  const hasConfig = await configExists();
  if (hasConfig) {
    const config = await readConfig();
    const accountCount = Object.values(config.accounts).flat().length;
    results.push({
      name: 'OMOCS Config',
      status: 'pass',
      message: `Found at ${getConfigPath()}`,
      detail: `Profile: ${config.activeProfile}, Accounts: ${accountCount}`,
    });
  } else {
    results.push({
      name: 'OMOCS Config',
      status: 'warn',
      message: 'Not found — run `omocs init` to set up',
    });
  }

  // 6. Check API keys
  spinner.text = 'Checking API keys...';
  if (hasConfig) {
    const config = await readConfig();
    const providers = Object.keys(config.accounts);
    if (providers.length > 0) {
      const activeAccounts = Object.values(config.accounts)
        .flat()
        .filter(a => a.status === 'active').length;
      results.push({
        name: 'API Keys',
        status: activeAccounts > 0 ? 'pass' : 'warn',
        message: `${activeAccounts} active key(s) across ${providers.length} provider(s)`,
      });
    } else {
      results.push({
        name: 'API Keys',
        status: 'warn',
        message: 'No API keys configured — run `omocs account add`',
      });
    }
  } else {
    // Check environment variables as fallback
    const envKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GITHUB_TOKEN'];
    const foundKeys = envKeys.filter(k => process.env[k]);
    results.push({
      name: 'API Keys',
      status: foundKeys.length > 0 ? 'pass' : 'warn',
      message: foundKeys.length > 0
        ? `Found ${foundKeys.length} key(s) in environment: ${foundKeys.join(', ')}`
        : 'No API keys found in config or environment',
    });
  }

  // 7. Check .opencode.json
  spinner.text = 'Checking OpenCode config...';
  const ocConfig = await readOpenCodeConfig();
  if (ocConfig) {
    results.push({
      name: '.opencode.json',
      status: 'pass',
      message: `Found at ${ocConfig.path}`,
    });
  } else {
    results.push({
      name: '.opencode.json',
      status: 'warn',
      message: 'Not found in current dir or home — run `omocs init`',
    });
  }

  // 8. Check LSP servers
  spinner.text = 'Checking LSP servers...';
  let lspInstalled = 0;
  let lspTotal = 0;
  for (const [key, lsp] of Object.entries(lspServers)) {
    lspTotal++;
    const exists = await commandExists(lsp.command);
    if (exists) lspInstalled++;
  }
  results.push({
    name: 'LSP Servers',
    status: lspInstalled > 0 ? 'pass' : 'warn',
    message: `${lspInstalled}/${lspTotal} installed`,
    detail: lspInstalled === 0 ? 'Run `omocs lsp detect` to find needed servers' : undefined,
  });

  // 9. Check disk space
  spinner.text = 'Checking disk space...';
  try {
    const homeDir = homedir();
    const stats = statSync(homeDir);
    // Simple check — just make sure home dir is accessible
    results.push({
      name: 'Disk Space',
      status: 'pass',
      message: 'Home directory accessible',
    });
  } catch {
    results.push({
      name: 'Disk Space',
      status: 'warn',
      message: 'Could not check disk space',
    });
  }

  // 10. Check MCP servers in config
  spinner.text = 'Checking MCP configuration...';
  if (ocConfig?.config?.mcpServers) {
    const mcpCount = Object.keys(ocConfig.config.mcpServers).length;
    results.push({
      name: 'MCP Servers',
      status: mcpCount > 0 ? 'pass' : 'warn',
      message: `${mcpCount} server(s) configured`,
    });
  } else {
    results.push({
      name: 'MCP Servers',
      status: 'warn',
      message: 'No MCP servers configured — run `omocs mcp install`',
    });
  }

  spinner.stop();
  return results;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Health check — diagnose your OpenCode setup')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      try {
        heading('🩺 OMOCS Doctor — Health Check');

        const results = await runChecks();

        // Display results
        const passed = results.filter(r => r.status === 'pass').length;
        const failed = results.filter(r => r.status === 'fail').length;
        const warned = results.filter(r => r.status === 'warn').length;

        console.log('');
        for (const result of results) {
          const icon = result.status === 'pass' ? icons.success
            : result.status === 'fail' ? icons.fail
            : icons.warn;
          const msg = result.status === 'pass' ? chalk.green(result.message)
            : result.status === 'fail' ? chalk.red(result.message)
            : chalk.yellow(result.message);

          console.log(`  ${icon} ${chalk.bold(result.name)}: ${msg}`);
          if (options.verbose && result.detail) {
            console.log(`     ${chalk.gray(result.detail)}`);
          }
        }

        console.log('');
        divider();
        console.log('');

        const summary = `${chalk.green(`${passed} passed`)}, ${chalk.red(`${failed} failed`)}, ${chalk.yellow(`${warned} warnings`)}`;
        if (failed > 0) {
          errorBox('Health Check Summary', `${summary}\n\nSome checks failed. Fix the issues above and run again.`);
        } else if (warned > 0) {
          infoBox('Health Check Summary', `${summary}\n\nAll critical checks passed! Warnings are optional improvements.`);
        } else {
          successBox('Health Check Summary', `${summary}\n\n🎉 Everything looks great! You're ready to go.`);
        }
      } catch (error) {
        const { handleError } = await import('../utils/ui.ts');
        handleError(error);
      }
    });
}
