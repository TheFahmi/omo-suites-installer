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
import { registerStatusCommand } from './commands/status.ts';
import { registerLaunchboardCommand } from './commands/launchboard.ts';
import { registerExportCommand, registerImportCommand } from './commands/export-import.ts';
import { registerDiffCommand } from './commands/diff.ts';
import { registerBenchmarkCommand } from './commands/benchmark.ts';
import { registerInitDeepCommand } from './commands/init-deep.ts';
import { registerPlanCommand } from './commands/plan.ts';
import { registerCostCommand } from './commands/cost.ts';
import { registerCheckCommand } from './commands/check.ts';

import { readPackageJson } from './utils/find-package-json.ts';

const pkg = readPackageJson(import.meta.url);
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
registerStatusCommand(program);
registerLaunchboardCommand(program);
registerExportCommand(program);
registerImportCommand(program);
registerDiffCommand(program);
registerBenchmarkCommand(program);
registerInitDeepCommand(program);
registerPlanCommand(program);
registerCostCommand(program);
registerCheckCommand(program);

// Default action (no command)
program.action(() => {
  showBanner();
  program.help();
});
