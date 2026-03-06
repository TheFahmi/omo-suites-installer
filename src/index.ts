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

const VERSION = '1.0.0';

export const program = new Command();

program
  .name('omocs')
  .description('OMOC Suites — CLI toolkit for OpenCode power users')
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

// Default action (no command)
program.action(() => {
  showBanner();
  program.help();
});
