import { Command } from 'commander';
import chalk from 'chalk';
import { showBanner, handleError } from './utils/ui.ts';
import { registerInitCommand } from './commands/init.ts';
import { registerDoctorCommand } from './commands/doctor.ts';
import { registerAccountCommand } from './commands/account.ts';
import { registerProfileCommand } from './commands/profile.ts';
import { registerAgentCommand } from './commands/agent.ts';
import { registerLspCommand } from './commands/lsp.ts';
import { registerMcpCommand } from './commands/mcp.ts';
import { registerStatsCommand } from './commands/stats.ts';
import { registerLaunchboardCommand } from './commands/launchboard.ts';

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __pkgDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(resolve(__pkgDir, 'package.json'), 'utf-8'));
const VERSION = pkg.version;

export const program = new Command();

program
  .name('omocs')
  .description('OMO Suites — CLI toolkit for OpenCode power users')
  .version(VERSION, '-v, --version', 'Show version')
  .hook('preAction', () => {
    // Global error handling
    process.on('uncaughtException', (error) => {
      handleError(error);
    });
    process.on('unhandledRejection', (error) => {
      handleError(error);
    });
  });

// Register all commands
registerInitCommand(program);
registerDoctorCommand(program);
registerAccountCommand(program);
registerProfileCommand(program);
registerAgentCommand(program);
registerLspCommand(program);
registerMcpCommand(program);
registerStatsCommand(program);
registerLaunchboardCommand(program);

// Default action (no command)
program.action(() => {
  showBanner();
  program.help();
});
