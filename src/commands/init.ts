import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { showBanner, successBox, infoBox, heading, success, info, bullet, icons, handleError } from '../utils/ui.ts';
import { readConfig, writeConfig, ensureConfigDir, configExists } from '../core/config.ts';
import { hashPassword, encrypt } from '../core/crypto.ts';
import { detectOpenCode, writeOpenCodeConfig, mergeProfile } from '../core/opencode.ts';
import { profiles, getProfile } from '../data/profiles.ts';
import { detectStack, suggestLSPs } from '../utils/detect.ts';
import { lspServers } from '../data/lsp-registry.ts';
import { mcpServers } from '../data/mcp-registry.ts';

const PROVIDERS = [
  { name: 'Anthropic (Claude)', value: 'anthropic', envKey: 'ANTHROPIC_API_KEY' },
  { name: 'OpenAI (GPT)', value: 'openai', envKey: 'OPENAI_API_KEY' },
  { name: 'Google (Gemini)', value: 'google', envKey: 'GOOGLE_API_KEY' },
  { name: 'GitHub Copilot', value: 'github', envKey: 'GITHUB_TOKEN' },
  { name: 'Groq', value: 'groq', envKey: 'GROQ_API_KEY' },
  { name: 'OpenRouter', value: 'openrouter', envKey: 'OPENROUTER_API_KEY' },
];

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Interactive setup wizard — configure OMOCS for the first time')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        showBanner();

        const exists = await configExists();
        if (exists && !options.force) {
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: 'OMOCS is already configured. Overwrite?',
            default: false,
          }]);
          if (!overwrite) {
            info('Setup cancelled. Use --force to overwrite.');
            return;
          }
        }

        heading('Step 1: Environment Check');

        // Check OpenCode
        const spinner = ora('Checking OpenCode installation...').start();
        const opencode = await detectOpenCode();
        if (opencode.installed) {
          spinner.succeed(chalk.green(`OpenCode found${opencode.version ? ` (${opencode.version})` : ''}`));
        } else {
          spinner.warn(chalk.yellow('OpenCode not found — you can still configure OMOCS'));
        }

        heading('Step 2: Master Password');
        info('Your API keys will be encrypted with a master password.');

        const { masterPassword } = await inquirer.prompt([{
          type: 'password',
          name: 'masterPassword',
          message: 'Set a master password:',
          mask: '*',
          validate: (input: string) => input.length >= 4 ? true : 'Password must be at least 4 characters',
        }]);

        const { confirmPassword } = await inquirer.prompt([{
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm master password:',
          mask: '*',
          validate: (input: string) => input === masterPassword ? true : 'Passwords do not match',
        }]);

        heading('Step 3: API Providers');

        const { selectedProviders } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selectedProviders',
          message: 'Which providers do you use?',
          choices: PROVIDERS.map(p => ({ name: p.name, value: p.value })),
        }]);

        // Collect API keys
        const accounts: Record<string, Array<{ label: string; key: string; priority: number; status: 'active' | 'rate-limited' | 'disabled' }>> = {};

        for (const providerKey of selectedProviders) {
          const provider = PROVIDERS.find(p => p.value === providerKey)!;

          // Check environment variable first
          const envValue = process.env[provider.envKey];
          let apiKey = '';

          if (envValue) {
            const { useEnv } = await inquirer.prompt([{
              type: 'confirm',
              name: 'useEnv',
              message: `Found ${provider.envKey} in environment. Use it?`,
              default: true,
            }]);
            if (useEnv) {
              apiKey = envValue;
            }
          }

          if (!apiKey) {
            const { key } = await inquirer.prompt([{
              type: 'password',
              name: 'key',
              message: `Enter API key for ${provider.name}:`,
              mask: '*',
              validate: (input: string) => input.length > 0 ? true : 'API key cannot be empty',
            }]);
            apiKey = key;
          }

          const encryptedKey = encrypt(apiKey, masterPassword);
          accounts[providerKey] = [{
            label: 'default',
            key: encryptedKey,
            priority: 1,
            status: 'active',
          }];
        }

        heading('Step 4: Choose Profile');

        const profileChoices = Object.entries(profiles).map(([key, profile]) => ({
          name: `${profile.name} — ${profile.description}`,
          value: key,
        }));

        const { selectedProfile } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedProfile',
          message: 'Choose a profile:',
          choices: profileChoices,
          default: 'balanced',
        }]);

        heading('Step 5: Project Detection');

        const detectSpinner = ora('Detecting project stack...').start();
        const stack = detectStack();
        detectSpinner.stop();

        if (stack.languages.length > 0 || stack.frameworks.length > 0) {
          info(`Detected: ${[...stack.languages, ...stack.frameworks].join(', ')}`);
          if (stack.packageManager) {
            info(`Package manager: ${stack.packageManager}`);
          }

          const suggestedLsps = suggestLSPs(stack);
          if (suggestedLsps.length > 0) {
            const { installLsps } = await inquirer.prompt([{
              type: 'checkbox',
              name: 'installLsps',
              message: 'Suggested LSP servers to configure:',
              choices: suggestedLsps.map(key => ({
                name: `${lspServers[key]?.name || key} — ${lspServers[key]?.description || ''}`,
                value: key,
                checked: true,
              })),
            }]);
            // LSP selection stored for later use
          }
        } else {
          info('No specific project stack detected in current directory.');
        }

        heading('Step 6: MCP Tools');

        const { installMcps } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'installMcps',
          message: 'Select MCP tools to configure:',
          choices: Object.entries(mcpServers).map(([key, server]) => ({
            name: `${server.name} — ${server.description}`,
            value: key,
            checked: key === 'context7' || key === 'filesystem',
          })),
        }]);

        heading('Step 7: Saving Configuration');

        const saveSpinner = ora('Saving configuration...').start();

        // Save OMOCS config
        ensureConfigDir();
        const config = await readConfig();
        config.activeProfile = selectedProfile;
        config.activeAgent = 'sisyphus';
        config.accounts = accounts;
        config.masterPasswordHash = hashPassword(masterPassword);
        config.preferences = {
          autoRotate: selectedProviders.length > 1,
        };
        await writeConfig(config);
        saveSpinner.text = 'OMOCS config saved...';

        // Generate .opencode.json
        const profile = getProfile(selectedProfile)!;
        await mergeProfile(profile);
        saveSpinner.text = '.opencode.json generated...';

        saveSpinner.succeed(chalk.green('Configuration saved!'));

        // Summary
        const summaryLines = [
          `${icons.check} Profile: ${chalk.bold(profile.name)}`,
          `${icons.check} Coder model: ${chalk.bold(profile.agents.coder)}`,
          `${icons.check} Task model: ${chalk.bold(profile.agents.task)}`,
          `${icons.check} API providers: ${chalk.bold(selectedProviders.length.toString())} configured`,
          `${icons.check} MCP tools: ${chalk.bold(installMcps.length.toString())} selected`,
          '',
          `${chalk.gray('Config:')} ~/.omocs/config.json`,
          `${chalk.gray('OpenCode:')} .opencode.json`,
          '',
          `Next: Run ${chalk.cyan('omocs doctor')} to verify your setup.`,
        ];

        successBox('Setup Complete! 🎉', summaryLines.join('\n'));
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') {
          console.log('\n  Setup cancelled.');
          return;
        }
        handleError(error);
      }
    });
}
