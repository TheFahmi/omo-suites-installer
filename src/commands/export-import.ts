import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { readConfig, writeConfig, getConfigDir } from '../core/config.ts';
import { readOpenCodeConfig } from '../core/opencode.ts';
import { customProfilesStore } from '../core/store.ts';
import { heading, success, fail, warn, info, icons, handleError, successBox } from '../utils/ui.ts';

interface ExportData {
  version: string;
  exportedAt: string;
  omocs: {
    config: Record<string, unknown>;
    customProfiles: Record<string, unknown>;
  };
  opencode: Record<string, unknown> | null;
}

function getDefaultFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `omocs-config-export-${yyyy}-${mm}-${dd}.json`;
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export all config (profiles, agents, MCP, LSP settings) to a single JSON file')
    .argument('[filename]', 'Output filename', getDefaultFilename())
    .action(async (filename: string) => {
      try {
        heading('📦 Export Configuration');

        const spinner = ora('Gathering configuration...').start();

        // Read OMOCS config
        const config = await readConfig();

        // Read custom profiles
        const customProfiles = await customProfilesStore.read();

        // Read OpenCode config
        const ocResult = await readOpenCodeConfig();
        const opencodeConfig = ocResult?.config || null;

        const exportData: ExportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          omocs: {
            config: config as unknown as Record<string, unknown>,
            customProfiles: customProfiles as unknown as Record<string, unknown>,
          },
          opencode: opencodeConfig as Record<string, unknown> | null,
        };

        spinner.stop();

        const outputPath = resolve(process.cwd(), filename);
        writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

        const stats = {
          profiles: Object.keys(customProfiles.profiles || {}).length,
          mcpServers: opencodeConfig?.mcpServers ? Object.keys(opencodeConfig.mcpServers).length : 0,
          lspServers: opencodeConfig?.lsp ? Object.keys(opencodeConfig.lsp).length : 0,
        };

        successBox('Export Complete! 📦', [
          `${icons.check} File: ${chalk.bold(outputPath)}`,
          `${icons.check} Custom profiles: ${chalk.bold(stats.profiles.toString())}`,
          `${icons.check} MCP servers: ${chalk.bold(stats.mcpServers.toString())}`,
          `${icons.check} LSP servers: ${chalk.bold(stats.lspServers.toString())}`,
          '',
          `Import on another machine: ${chalk.cyan(`omocs import ${filename}`)}`,
        ].join('\n'));
      } catch (error) {
        handleError(error);
      }
    });
}

export function registerImportCommand(program: Command): void {
  program
    .command('import')
    .description('Import config from an exported JSON file')
    .argument('<filename>', 'Path to exported config file')
    .option('--force', 'Skip confirmation prompt')
    .action(async (filename: string, options: { force?: boolean }) => {
      try {
        heading('📥 Import Configuration');

        const filePath = resolve(process.cwd(), filename);

        if (!existsSync(filePath)) {
          fail(`File not found: ${filePath}`);
          return;
        }

        const spinner = ora('Reading export file...').start();

        let importData: ExportData;
        try {
          const content = readFileSync(filePath, 'utf-8');
          importData = JSON.parse(content);
        } catch {
          spinner.stop();
          fail('Invalid JSON file. Make sure this is an OMOCS export file.');
          return;
        }

        // Validate format
        if (!importData.version || !importData.omocs) {
          spinner.stop();
          fail('Invalid export format. Missing required fields (version, omocs).');
          return;
        }

        spinner.stop();

        // Show what will be imported
        const configDir = getConfigDir();
        const customProfiles = importData.omocs.customProfiles as { profiles?: Record<string, unknown> } | undefined;
        const opencodeConfig = importData.opencode as { mcpServers?: Record<string, unknown>; lsp?: Record<string, unknown> } | null;

        info(`Export date: ${chalk.bold(importData.exportedAt)}`);
        info(`Export version: ${chalk.bold(importData.version)}`);
        info(`Custom profiles: ${chalk.bold(String(Object.keys(customProfiles?.profiles || {}).length))}`);
        info(`MCP servers: ${chalk.bold(String(Object.keys(opencodeConfig?.mcpServers || {}).length))}`);
        info(`LSP servers: ${chalk.bold(String(Object.keys(opencodeConfig?.lsp || {}).length))}`);
        info(`Config dir: ${chalk.bold(configDir)}`);
        console.log('');

        // Confirm unless --force
        if (!options.force) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'This will overwrite your current configuration. Continue?',
            default: false,
          }]);

          if (!confirm) {
            info('Import cancelled.');
            return;
          }
        }

        const importSpinner = ora('Importing configuration...').start();

        // Import OMOCS config
        if (importData.omocs.config) {
          importSpinner.text = 'Importing OMOCS config...';
          await writeConfig(importData.omocs.config as any);
        }

        // Import custom profiles
        if (customProfiles?.profiles) {
          importSpinner.text = 'Importing custom profiles...';
          await customProfilesStore.write(customProfiles as any);
        }

        // Import OpenCode config
        if (importData.opencode) {
          importSpinner.text = 'Importing OpenCode config...';
          const ocResult = await readOpenCodeConfig();
          const targetPath = ocResult?.path || resolve(process.cwd(), '.opencode.json');
          const existing = ocResult?.config || {};

          // Merge: imported config overrides existing
          const merged = { ...existing, ...importData.opencode };
          writeFileSync(targetPath, JSON.stringify(merged, null, 2));
        }

        importSpinner.succeed(chalk.green('Configuration imported!'));

        successBox('Import Complete! 📥', [
          `${icons.check} OMOCS config restored`,
          customProfiles?.profiles
            ? `${icons.check} Custom profiles: ${Object.keys(customProfiles.profiles).length} imported`
            : `${icons.cross} No custom profiles to import`,
          importData.opencode
            ? `${icons.check} OpenCode config merged`
            : `${icons.cross} No OpenCode config to import`,
          '',
          `Run ${chalk.cyan('omocs doctor')} to verify your setup.`,
        ].join('\n'));
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });
}
