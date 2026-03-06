import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { mcpServers, getMcpServer, listMcpKeys } from '../data/mcp-registry.ts';
import { addMcpToConfig, removeMcpFromConfig, readOpenCodeConfig } from '../core/opencode.ts';
import { createTable, heading, success, fail, warn, info, icons, handleError } from '../utils/ui.ts';

export function registerMcpCommand(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('MCP tools manager');

  // ─── mcp list ──────────────────────────────────────────────────────
  mcp
    .command('list')
    .description('List available MCP servers')
    .action(async () => {
      try {
        heading('🔌 Available MCP Servers');

        // Check which are configured
        const ocConfig = await readOpenCodeConfig();
        const configured = ocConfig?.config?.mcpServers ? Object.keys(ocConfig.config.mcpServers) : [];

        const rows: (string | number)[][] = [];
        for (const [key, server] of Object.entries(mcpServers)) {
          const isConfigured = configured.includes(key);
          rows.push([
            key,
            server.name,
            server.description,
            isConfigured ? chalk.green('● configured') : chalk.gray('○ available'),
            server.tags.join(', '),
          ]);
        }

        console.log(createTable(
          ['Key', 'Name', 'Description', 'Status', 'Tags'],
          rows
        ));

        // Show configured servers from .opencode.json that aren't in registry
        if (ocConfig?.config?.mcpServers) {
          const custom = Object.keys(ocConfig.config.mcpServers).filter(k => !mcpServers[k]);
          if (custom.length > 0) {
            info(`Custom servers in config: ${chalk.bold(custom.join(', '))}`);
          }
        }

        console.log(`\n  Install: ${chalk.cyan('omocs mcp install <server>')}`);
        console.log(`  Remove: ${chalk.cyan('omocs mcp remove <server>')}\n`);
      } catch (error) {
        handleError(error);
      }
    });

  // ─── mcp install ───────────────────────────────────────────────────
  mcp
    .command('install')
    .description('Install/configure an MCP server')
    .argument('[server]', 'MCP server key')
    .action(async (serverKey?: string) => {
      try {
        if (!serverKey) {
          const ocConfig = await readOpenCodeConfig();
          const configured = ocConfig?.config?.mcpServers ? Object.keys(ocConfig.config.mcpServers) : [];

          const { selected } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selected',
            message: 'Select MCP servers to install:',
            choices: Object.entries(mcpServers).map(([key, server]) => ({
              name: `${server.name} — ${server.description}`,
              value: key,
              checked: configured.includes(key),
            })),
          }]);

          for (const key of selected) {
            await installMcpServer(key);
          }
          return;
        }

        await installMcpServer(serverKey);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── mcp remove ────────────────────────────────────────────────────
  mcp
    .command('remove')
    .description('Remove an MCP server from config')
    .argument('<server>', 'MCP server key')
    .action(async (serverKey: string) => {
      try {
        const removed = await removeMcpFromConfig(serverKey);
        if (removed) {
          success(`Removed ${serverKey} from .opencode.json`);
        } else {
          fail(`${serverKey} not found in .opencode.json`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}

async function installMcpServer(key: string): Promise<void> {
  const server = getMcpServer(key);
  if (!server) {
    fail(`Unknown MCP server: ${key}`);
    info(`Available: ${listMcpKeys().join(', ')}`);
    return;
  }

  const spinner = ora(`Configuring ${server.name}...`).start();

  // Collect env vars if needed
  let env: Record<string, string> | undefined;
  if (server.env) {
    spinner.stop();
    const envEntries: Record<string, string> = {};
    for (const [envKey, defaultVal] of Object.entries(server.env)) {
      const existingVal = process.env[envKey];
      if (existingVal) {
        envEntries[envKey] = existingVal;
        info(`Using ${envKey} from environment`);
      } else {
        const { value } = await inquirer.prompt([{
          type: 'password',
          name: 'value',
          message: `Enter ${envKey}:`,
          mask: '*',
        }]);
        if (value) {
          envEntries[envKey] = value;
        }
      }
    }
    env = Object.keys(envEntries).length > 0 ? envEntries : undefined;
    spinner.start();
  }

  await addMcpToConfig(key, server.command, server.args, env);
  spinner.succeed(chalk.green(`${server.name} configured in .opencode.json`));
}
