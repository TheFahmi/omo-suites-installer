import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { readOpenCodeConfig } from '../core/opencode.ts';
import { heading, fail, info, icons, handleError, createTable, successBox, warnBox } from '../utils/ui.ts';

interface McpServerConfig {
  type?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

interface McpCheckResult {
  name: string;
  command: string;
  status: 'alive' | 'dead' | 'unknown';
  message: string;
  responseTimeMs?: number;
}

async function checkStdioServer(
  name: string,
  config: McpServerConfig,
  timeoutMs: number = 5000,
): Promise<McpCheckResult> {
  const start = Date.now();
  const command = config.command;
  const args = config.args || [];

  return new Promise<McpCheckResult>((resolve) => {
    try {
      const env = { ...process.env, ...(config.env || {}) };
      const child = spawn(command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs,
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill('SIGTERM');
          // If process started and ran for timeoutMs, it's likely alive
          resolve({
            name,
            command: `${command} ${args.join(' ')}`,
            status: 'alive',
            message: 'Server process started successfully (timed out waiting for response)',
            responseTimeMs: Date.now() - start,
          });
        }
      }, timeoutMs);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Send MCP initialize request via JSON-RPC
      const initRequest = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'omocs-health-check', version: '1.0.0' },
        },
      });

      child.stdin.write(initRequest + '\n');

      // Check for response
      const responseTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          child.kill('SIGTERM');

          if (stdout.includes('jsonrpc') || stdout.includes('result')) {
            resolve({
              name,
              command: `${command} ${args.join(' ')}`,
              status: 'alive',
              message: 'Server responded to MCP initialize',
              responseTimeMs: Date.now() - start,
            });
          } else {
            resolve({
              name,
              command: `${command} ${args.join(' ')}`,
              status: 'alive',
              message: 'Server process started (no JSON-RPC response yet)',
              responseTimeMs: Date.now() - start,
            });
          }
        }
      }, 3000);

      child.on('error', (err: Error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          clearTimeout(responseTimer);

          let message = err.message;
          if (message.includes('ENOENT')) {
            message = `Command not found: ${command}. Install it first.`;
          } else if (message.includes('EACCES')) {
            message = `Permission denied: ${command}`;
          }

          resolve({
            name,
            command: `${command} ${args.join(' ')}`,
            status: 'dead',
            message,
            responseTimeMs: Date.now() - start,
          });
        }
      });

      child.on('exit', (code: number | null) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          clearTimeout(responseTimer);

          if (stdout.includes('jsonrpc') || stdout.includes('result')) {
            resolve({
              name,
              command: `${command} ${args.join(' ')}`,
              status: 'alive',
              message: 'Server responded and exited',
              responseTimeMs: Date.now() - start,
            });
          } else if (code === 0) {
            resolve({
              name,
              command: `${command} ${args.join(' ')}`,
              status: 'alive',
              message: 'Server started and exited cleanly',
              responseTimeMs: Date.now() - start,
            });
          } else {
            const errMsg = stderr.trim().split('\n')[0] || `Exited with code ${code}`;
            resolve({
              name,
              command: `${command} ${args.join(' ')}`,
              status: 'dead',
              message: errMsg.slice(0, 120),
              responseTimeMs: Date.now() - start,
            });
          }
        }
      });
    } catch (err) {
      resolve({
        name,
        command: `${command} ${args.join(' ')}`,
        status: 'dead',
        message: err instanceof Error ? err.message : String(err),
        responseTimeMs: Date.now() - start,
      });
    }
  });
}

async function checkHttpServer(
  name: string,
  config: McpServerConfig,
  timeoutMs: number = 5000,
): Promise<McpCheckResult> {
  const start = Date.now();
  const url = config.url || '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      name,
      command: url,
      status: response.ok ? 'alive' : 'dead',
      message: response.ok ? `HTTP ${response.status} OK` : `HTTP ${response.status}`,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      command: url,
      status: 'dead',
      message: err instanceof Error ? err.message.slice(0, 120) : String(err),
      responseTimeMs: Date.now() - start,
    };
  }
}

export function registerMcpStatusCommand(mcpCommand: Command): void {
  mcpCommand
    .command('status')
    .description('Check health of all configured MCP servers')
    .option('--timeout <ms>', 'Timeout per server check in ms', '5000')
    .action(async (options: { timeout?: string }) => {
      try {
        heading('🔌 MCP Server Health Check');

        const ocResult = await readOpenCodeConfig();
        const mcpServers = ocResult?.config?.mcpServers as Record<string, McpServerConfig> | undefined;

        if (!mcpServers || Object.keys(mcpServers).length === 0) {
          warnBox('No MCP Servers', [
            'No MCP servers found in opencode.json.',
            '',
            `Configure servers: ${chalk.cyan('omocs mcp install')}`,
          ].join('\n'));
          return;
        }

        const timeoutMs = parseInt(options.timeout || '5000', 10);
        const serverCount = Object.keys(mcpServers).length;

        info(`Found ${chalk.bold(serverCount.toString())} MCP server(s) in config`);
        info(`Timeout: ${timeoutMs}ms per server`);
        console.log('');

        const results: McpCheckResult[] = [];

        for (const [name, config] of Object.entries(mcpServers)) {
          const spinner = ora(`Checking ${chalk.bold(name)}...`).start();

          let result: McpCheckResult;

          if (config.type === 'sse' || config.type === 'http' || config.url) {
            result = await checkHttpServer(name, config, timeoutMs);
          } else {
            result = await checkStdioServer(name, config, timeoutMs);
          }

          results.push(result);

          if (result.status === 'alive') {
            spinner.succeed(`${chalk.bold(name)}: ${chalk.green('● ALIVE')} — ${result.message}`);
          } else if (result.status === 'dead') {
            spinner.fail(`${chalk.bold(name)}: ${chalk.red('● DEAD')} — ${result.message}`);
          } else {
            spinner.warn(`${chalk.bold(name)}: ${chalk.yellow('● UNKNOWN')} — ${result.message}`);
          }
        }

        console.log('');

        // Summary table
        heading('Summary');

        const rows = results.map(r => {
          const status = r.status === 'alive'
            ? chalk.green('● ALIVE')
            : r.status === 'dead'
              ? chalk.red('● DEAD')
              : chalk.yellow('● UNKNOWN');
          const time = r.responseTimeMs !== undefined ? `${r.responseTimeMs}ms` : '-';
          return [r.name, status, time, r.command.slice(0, 40)];
        });

        console.log(createTable(
          ['Server', 'Status', 'Response', 'Command'],
          rows,
        ));

        const alive = results.filter(r => r.status === 'alive').length;
        const dead = results.filter(r => r.status === 'dead').length;

        console.log('');
        if (dead === 0) {
          console.log(`  ${chalk.green('✓')} All ${alive} servers healthy!`);
        } else {
          console.log(`  ${chalk.green('✓')} ${alive} alive   ${chalk.red('✗')} ${dead} dead`);
          if (dead > 0) {
            console.log(`\n  ${chalk.gray('Fix dead servers:')}`);
            for (const r of results.filter(r => r.status === 'dead')) {
              console.log(`    ${chalk.yellow('→')} ${r.name}: ${chalk.gray(r.message)}`);
            }
          }
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });
}
