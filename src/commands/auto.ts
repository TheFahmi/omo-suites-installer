import { Command } from 'commander';
import chalk from 'chalk';
import { runAutoChecks, resetAutoState, suppressWarning } from '../core/auto.ts';
import { heading, success, fail, info, handleError, infoBox } from '../utils/ui.ts';

// ─── Register Command ────────────────────────────────────────────────
export function registerAutoCommand(program: Command): void {
  const auto = program
    .command('auto')
    .description('Manage automatic background checks (doctor, index, compact, template)');

  // auto run
  auto
    .command('run')
    .description('Run all auto checks now')
    .option('--verbose', 'Show all results including OK statuses')
    .action(async (opts) => {
      try {
        heading('⚡ Auto Checks');
        info(`Workspace: ${chalk.gray(process.cwd())}`);
        console.log('');

        const results = await runAutoChecks(process.cwd(), { silent: true });

        if (results.length === 0) {
          success('Nothing to check.');
          return;
        }

        for (const r of results) {
          if (r.status === 'ok' && !opts.verbose) continue;

          const icon = r.status === 'ok' ? chalk.green('✅')
            : r.status === 'fixed' ? chalk.green('⚡')
            : chalk.yellow('⚠️');

          console.log(`  ${icon} ${chalk.bold(r.action)} — ${r.message}`);
        }

        const ok = results.filter(r => r.status === 'ok').length;
        const fixed = results.filter(r => r.status === 'fixed').length;
        const warned = results.filter(r => r.status === 'warn').length;

        console.log('');
        info(`OK: ${ok} | Fixed: ${fixed} | Warnings: ${warned}`);
      } catch (err) { handleError(err); }
    });

  // auto reset
  auto
    .command('reset')
    .description('Reset auto state (force re-run all checks)')
    .action(() => {
      try {
        resetAutoState();
        success('Auto state reset. All checks will re-run on next invocation.');
      } catch (err) { handleError(err); }
    });

  // auto suppress
  auto
    .command('suppress <warning>')
    .description('Suppress a specific auto warning')
    .action((warning) => {
      try {
        suppressWarning(warning);
        success(`Suppressed: "${warning}"`);
      } catch (err) { handleError(err); }
    });

  // auto status
  auto
    .command('status')
    .description('Show auto check state')
    .action(() => {
      try {
        heading('⚡ Auto Status');

        const { existsSync, readFileSync } = require('fs');
        const { join } = require('path');
        const { homedir } = require('os');

        const stateFile = join(homedir(), '.omocs', 'auto-state.json');
        if (!existsSync(stateFile)) {
          info('No auto state yet. Run `omocs auto run` to initialize.');
          return;
        }

        const state = JSON.parse(readFileSync(stateFile, 'utf-8'));

        const formatTime = (ts: number) => ts ? new Date(ts).toLocaleString() : 'never';

        console.log(`  ${chalk.dim('Last compact:')}  ${formatTime(state.lastCompact)}`);
        console.log(`  ${chalk.dim('Last doctor:')}   ${formatTime(state.lastDoctor)}`);
        console.log(`  ${chalk.dim('Indexed workspaces:')} ${Object.keys(state.lastIndex || {}).length}`);
        console.log(`  ${chalk.dim('Suppressed warnings:')} ${(state.suppressedWarnings || []).length}`);

        if (state.suppressedWarnings?.length > 0) {
          console.log('');
          info('Suppressed:');
          for (const w of state.suppressedWarnings) {
            console.log(`    ${chalk.gray('•')} ${chalk.dim(w)}`);
          }
        }
      } catch (err) { handleError(err); }
    });

  // Default: show help
  auto.action(() => {
    heading('⚡ Auto Checks');
    infoBox('Auto', [
      'Automatic background checks run on every omocs command.',
      '',
      `  ${chalk.cyan('omocs auto run')}       — run all checks now`,
      `  ${chalk.cyan('omocs auto status')}    — show check state`,
      `  ${chalk.cyan('omocs auto reset')}     — force re-run all`,
      `  ${chalk.cyan('omocs auto suppress')}  — hide a warning`,
      '',
      'Checks: doctor, index rebuild, compact, template suggest',
      'Auto-runs on startup (non-blocking, max every 24h).',
    ].join('\n'));
  });
}
