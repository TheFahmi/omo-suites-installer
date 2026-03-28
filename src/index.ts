import { Command } from 'commander';
import chalk from 'chalk';
import { showBanner, handleError } from './utils/ui.ts';
import { setDebug, setVerbose, isDebug } from './utils/debug.ts';
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
import { registerMemoryCommand } from './commands/memory.ts';
import { registerCompletionCommand } from './commands/completion.ts';
import { registerIndexCommand } from './commands/index-cmd.ts';
import { registerCompactCommand } from './commands/compact.ts';
import { registerSessionCommand } from './commands/session.ts';
import { registerWorktreeCommand } from './commands/worktree.ts';
import { registerTemplateCommand } from './commands/template.ts';
import { registerBootstrapCommand } from './commands/bootstrap.ts';
import { registerFallbackCommand } from './commands/fallback.ts';
import { registerWatchCommand } from './commands/watch.ts';
import { registerMarketplaceCommand } from './commands/marketplace.ts';
import { registerSquadCommand } from './commands/squad.ts';
import { registerAutoCommand } from './commands/auto.ts';
import { registerConfigCommand } from './commands/config.ts';
import { registerTestSmokeCommand } from './commands/test-smoke.ts';
import { runAutoChecks } from './core/auto.ts';


import { readPackageJson } from './utils/find-package-json.ts';

const pkg = readPackageJson(import.meta.url);
const VERSION = pkg.version;

export const program = new Command();

program
  .name('omocs')
  .description('OMO Suites — CLI toolkit for OpenCode power users')
  .version(VERSION, '-v, --version', 'Show version')
  .option('--debug', 'Enable debug output')
  .option('--verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    // Check global debug options
    const opts = program.opts();
    if (opts.debug) setDebug(true);
    if (opts.verbose) setVerbose(true);

    // Global error handling
    process.on('uncaughtException', (error) => {
      handleError(error);
    });
    process.on('unhandledRejection', (error) => {
      handleError(error);
    });

    // Auto checks on every command (non-blocking, silent)
    // Skip for auto command itself, --help, --version
    const cmdName = thisCommand.args?.[0] || thisCommand.name();
    const skipAuto = ['auto', 'completion', 'help'].includes(cmdName);
    if (!skipAuto) {
      runAutoChecks(process.cwd(), { silent: false }).catch(() => {});
    }
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
registerMemoryCommand(program);
registerCompletionCommand(program);
registerIndexCommand(program);
registerCompactCommand(program);
registerSessionCommand(program);
registerWorktreeCommand(program);
registerTemplateCommand(program);
registerBootstrapCommand(program);
registerFallbackCommand(program);
registerWatchCommand(program);
registerMarketplaceCommand(program);
registerSquadCommand(program);
registerAutoCommand(program);
registerConfigCommand(program);
registerTestSmokeCommand(program);


// Default action (no command)
program.action(() => {
  showBanner();
  program.help();
});
