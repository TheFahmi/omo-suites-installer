import { Command } from 'commander';
import { readConfig, configExists, getConfigPath } from '../core/config.ts';
import { heading, success, fail, icons } from '../utils/ui.ts';
import chalk from 'chalk';

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command('config').description('Manage OMOCS configuration');

  configCmd
    .command('validate')
    .description('Validate the syntax and structure of the config file')
    .action(() => {
      heading('Config Validation');
      if (!configExists()) {
        console.log(`${icons.warn} Config file not found at ${getConfigPath()}`);
        return;
      }
      
      try {
        const config = readConfig();
        let isValid = true;
        let errors: string[] = [];

        if (!config.version) { isValid = false; errors.push('Missing version field'); }
        if (!config.accounts || typeof config.accounts !== 'object') { isValid = false; errors.push('Accounts field is missing or invalid'); }
        if (!config.activeProfile) { isValid = false; errors.push('Missing activeProfile'); }

        if (isValid) {
          console.log(`${icons.success} Config file at ${getConfigPath()} is valid.`);
        } else {
          console.log(`${icons.fail} Config file is invalid:`);
          errors.forEach(e => console.log(`  - ${chalk.red(e)}`));
        }
      } catch (err: any) {
        console.log(`${icons.fail} Error reading or parsing config file: ${err.message}`);
      }
    });
}