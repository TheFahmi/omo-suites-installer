import { Command } from 'commander';
import { heading, success, icons } from '../utils/ui.ts';
import { commandExists } from '../utils/shell.ts';
import { detectOpenCode } from '../core/opencode.ts';
import { configExists } from '../core/config.ts';
import chalk from 'chalk';

export function registerTestSmokeCommand(program: Command): void {
  program
    .command('self-test')
    .description('Run a light smoke test to check core integration')
    .action(async () => {
      heading('Smoke Test');
      
      let allPassed = true;

      const logPass = (msg: string) => console.log(`  ${icons.success} ${msg}`);
      const logFail = (msg: string) => {
        console.log(`  ${icons.fail} ${chalk.red(msg)}`);
        allPassed = false;
      };

      // 1. Dependency tests
      if (await commandExists('bun')) logPass('bun is available');
      else logFail('bun is missing');
      
      if (await commandExists('git')) logPass('git is available');
      else logFail('git is missing');

      // 2. OpenCode test
      const opencode = await detectOpenCode();
      if (opencode.installed) logPass(`OpenCode is installed (${opencode.version})`);
      else logFail('OpenCode is missing');

      // 3. OMOCS test
      if (configExists()) logPass('OMOCS config exists');
      else logFail('OMOCS config missing');

      console.log('');
      if (allPassed) {
        console.log(chalk.green('✅ Smoke test passed. Everything looks functional.'));
      } else {
        console.log(chalk.red('❌ Smoke test failed. Please fix the missing dependencies.'));
      }
    });
}