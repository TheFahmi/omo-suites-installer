import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { showBanner, successBox, infoBox, heading, success, info, bullet, icons, handleError } from '../utils/ui.ts';
import { readConfig, writeConfig, ensureConfigDir, configExists } from '../core/config.ts';
import { hashPassword, encrypt } from '../core/crypto.ts';
import { detectOpenCode, writeOpenCodeConfig, mergeProfile, findOpencodeConfig, checkOhMyOpenCode } from '../core/opencode.ts';
import { profiles, getProfile } from '../data/profiles.ts';
import { detectStack, suggestLSPs } from '../utils/detect.ts';
import { lspServers } from '../data/lsp-registry.ts';
import { mcpServers } from '../data/mcp-registry.ts';

const AUTH_PLUGINS = [
  { name: 'Antigravity (Google DeepMind)', value: 'opencode-antigravity-auth', package: 'opencode-antigravity-auth@1.4.6', description: 'OAuth login for Google DeepMind models' },
  { name: 'OpenAI Codex', value: 'opencode-openai-codex-auth', package: 'opencode-openai-codex-auth@latest', description: 'OAuth login for OpenAI Codex CLI' },
];

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

        // ═══════════════════════════════════════════════════════════
        // Step 1: Environment Check
        // ═══════════════════════════════════════════════════════════
        heading('Step 1: Environment Check');

        // Check OpenCode
        const spinner = ora('Checking OpenCode installation...').start();
        const opencode = await detectOpenCode();
        if (opencode.installed) {
          spinner.succeed(chalk.green(`OpenCode found${opencode.version ? ` (${opencode.version})` : ''}`));
        } else {
          spinner.warn(chalk.yellow('OpenCode not found — you can still configure OMOCS'));
        }

        // ═══════════════════════════════════════════════════════════
        // Step 2: Install oh-my-opencode
        // ═══════════════════════════════════════════════════════════
        heading('Step 2: Install oh-my-opencode');

        const ohmySpinner = ora('Checking oh-my-opencode...').start();
        const ohmyInstalled = await checkOhMyOpenCode();

        if (ohmyInstalled) {
          ohmySpinner.succeed('oh-my-opencode already installed');
        } else {
          ohmySpinner.text = 'Installing oh-my-opencode...';
          try {
            execSync('npm install -g oh-my-opencode 2>/dev/null || bun add -g oh-my-opencode 2>/dev/null', { stdio: 'pipe' });
            ohmySpinner.succeed('oh-my-opencode installed');
          } catch {
            ohmySpinner.warn('Could not auto-install oh-my-opencode. Add manually to opencode.json plugins.');
          }
        }

        // ═══════════════════════════════════════════════════════════
        // Step 3: Register Plugins
        // ═══════════════════════════════════════════════════════════
        heading('Step 3: Register OMO Suites Plugin');

        const pluginSpinner = ora('Registering OMO Suites as OpenCode plugin...').start();

        try {
          const opencodeConfigPath = findOpencodeConfig();
          let opencodeConfig: Record<string, any> = {};

          if (existsSync(opencodeConfigPath)) {
            opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8'));
          }

          // Ensure plugin array exists
          if (!opencodeConfig.plugin) opencodeConfig.plugin = [];

          // Add oh-my-opencode if not present
          if (!opencodeConfig.plugin.includes('oh-my-opencode')) {
            opencodeConfig.plugin.push('oh-my-opencode');
          }

          // Add omocs if not present
          if (!opencodeConfig.plugin.includes('omocs') && !opencodeConfig.plugin.some((p: string) => p.includes('omocs'))) {
            opencodeConfig.plugin.push('omocs');
          }

          // Ensure parent directory exists
          const configDir = dirname(opencodeConfigPath);
          if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
          }

          writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
          pluginSpinner.succeed('OMO Suites + oh-my-opencode registered in opencode.json');
        } catch (e) {
          pluginSpinner.warn('Could not auto-register plugins. Add manually to opencode.json');
        }

        // ═══════════════════════════════════════════════════════════
        // Step 4: Setup Launchboard
        // ═══════════════════════════════════════════════════════════
        heading('Step 4: Setup Launchboard');

        let setupLaunchboard = false;

        const lbPrompt = await inquirer.prompt([{
          type: 'confirm',
          name: 'setupLaunchboard',
          message: 'Setup Launchboard (AI Kanban board)? Backend :3030 + Frontend :3040',
          default: true,
        }]);
        setupLaunchboard = lbPrompt.setupLaunchboard;

        if (setupLaunchboard) {
          // Resolve launchboard dir relative to this file's package root
          const lbDir = resolve(dirname(new URL(import.meta.url).pathname), '../../packages/launchboard');

          if (!existsSync(lbDir)) {
            info('Launchboard package not found. Skipping.');
            setupLaunchboard = false;
          } else {
            const lbSpinner = ora('Installing Launchboard dependencies...').start();
            try {
              execSync('bun install', { cwd: lbDir, stdio: 'pipe' });
              lbSpinner.succeed('Backend dependencies installed');
            } catch (e) {
              lbSpinner.fail('Failed to install backend deps');
            }

            // Frontend deps
            const frontendDir = resolve(lbDir, 'frontend');
            if (existsSync(frontendDir)) {
              const feSpinner = ora('Installing frontend dependencies...').start();
              try {
                execSync('bun install', { cwd: frontendDir, stdio: 'pipe' });
                feSpinner.succeed('Frontend dependencies installed');
              } catch {
                feSpinner.fail('Failed to install frontend deps');
              }
            }

            // Create DB if not exists
            const dbPath = resolve(lbDir, 'launchboard.db');
            if (!existsSync(dbPath)) {
              const dbSpinner = ora('Creating database...').start();
              try {
                execSync('bunx drizzle-kit push', { cwd: lbDir, stdio: 'pipe' });
                dbSpinner.succeed('Database created');

                const seedSpinner = ora('Seeding sample data...').start();
                try {
                  execSync('bun run seed', { cwd: lbDir, stdio: 'pipe' });
                  seedSpinner.succeed('Sample data seeded');
                } catch {
                  seedSpinner.fail('Failed to seed sample data');
                }
              } catch {
                dbSpinner.fail('Failed to setup database');
              }
            } else {
              info('Launchboard database already exists');
            }

            success('Launchboard ready! Run: omocs launchboard start');
          }
        }

        // ═══════════════════════════════════════════════════════════
        // Step 5: Master Password
        // ═══════════════════════════════════════════════════════════
        heading('Step 5: Master Password');
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

        // ═══════════════════════════════════════════════════════════
        // Step 6: API Providers
        // ═══════════════════════════════════════════════════════════
        heading('Step 6: API Providers');

        // --- 6a: Auth Plugins (recommended) ---
        const installedAuthPlugins: string[] = [];

        const { selectedAuthPlugins } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selectedAuthPlugins',
          message: 'Authenticate via login plugins (recommended):',
          choices: AUTH_PLUGINS.map(p => ({
            name: `${p.name} — ${p.description}`,
            value: p.value,
          })),
        }]);

        if (selectedAuthPlugins.length > 0) {
          // Install each selected auth plugin
          for (const pluginValue of selectedAuthPlugins) {
            const plugin = AUTH_PLUGINS.find(p => p.value === pluginValue)!;
            const authSpinner = ora(`Installing ${plugin.package}...`).start();
            try {
              execSync(`npm install -g ${plugin.package} 2>/dev/null`, { stdio: 'pipe' });
              authSpinner.succeed(`${plugin.package} installed`);
              installedAuthPlugins.push(plugin.value);
            } catch {
              authSpinner.warn(`Failed to install ${plugin.package} — you can install it manually later`);
            }
          }

          // Register auth plugins in opencode.json
          try {
            const opencodeConfigPath = findOpencodeConfig();
            let opencodeConfig: Record<string, any> = {};
            if (existsSync(opencodeConfigPath)) {
              opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8'));
            }
            if (!opencodeConfig.plugin) opencodeConfig.plugin = [];
            for (const pluginName of installedAuthPlugins) {
              if (!opencodeConfig.plugin.includes(pluginName)) {
                opencodeConfig.plugin.push(pluginName);
              }
            }
            const configDir = dirname(opencodeConfigPath);
            if (!existsSync(configDir)) {
              mkdirSync(configDir, { recursive: true });
            }
            writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
            success('Registered auth plugins in opencode.json');
          } catch {
            info('Could not auto-register auth plugins in opencode.json. Add manually.');
          }
        }

        // --- 6b: Manual API Keys ---
        let selectedProviders: string[] = [];
        const accounts: Record<string, Array<{ label: string; key: string; priority: number; status: 'active' | 'rate-limited' | 'disabled' }>> = {};

        const manualKeyMessage = selectedAuthPlugins.length > 0
          ? 'Also add manual API keys for other providers?'
          : 'Which providers do you use?';

        const { wantManualKeys } = selectedAuthPlugins.length > 0
          ? await inquirer.prompt([{
              type: 'confirm',
              name: 'wantManualKeys',
              message: 'Also configure manual API keys for other providers?',
              default: false,
            }])
          : { wantManualKeys: true };

        if (wantManualKeys) {
          const providerAnswer = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selectedProviders',
            message: manualKeyMessage,
            choices: PROVIDERS.map(p => ({ name: p.name, value: p.value })),
          }]);
          selectedProviders = providerAnswer.selectedProviders;

          // Collect API keys
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
        }

        // ═══════════════════════════════════════════════════════════
        // Step 7: Choose Profile
        // ═══════════════════════════════════════════════════════════
        heading('Step 7: Choose Profile');

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

        // ═══════════════════════════════════════════════════════════
        // Step 8: Project Detection
        // ═══════════════════════════════════════════════════════════
        heading('Step 8: Project Detection');

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

        // ═══════════════════════════════════════════════════════════
        // Step 9: MCP Tools
        // ═══════════════════════════════════════════════════════════
        heading('Step 9: MCP Tools');

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

        // ═══════════════════════════════════════════════════════════
        // Step 10: Saving Configuration
        // ═══════════════════════════════════════════════════════════
        heading('Step 10: Saving Configuration');

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
          `${icons.check} oh-my-opencode: ${chalk.bold(ohmyInstalled ? 'found' : 'installed')}`,
          `${icons.check} Plugins: oh-my-opencode + omocs registered`,
          installedAuthPlugins.length > 0
            ? `${icons.check} Auth plugins: ${chalk.bold(installedAuthPlugins.join(', '))}`
            : `${icons.cross} Auth plugins: none (skipped)`,
          setupLaunchboard ? `${icons.check} Launchboard: ${chalk.bold('ready')} (omocs lb start)` : `${icons.cross} Launchboard: skipped`,
          `${icons.check} Profile: ${chalk.bold(profile.name)}`,
          `${icons.check} Coder model: ${chalk.bold(profile.agents.coder)}`,
          `${icons.check} Task model: ${chalk.bold(profile.agents.task)}`,
          selectedProviders.length > 0
            ? `${icons.check} API providers: ${chalk.bold(selectedProviders.length.toString())} configured`
            : `${icons.cross} API providers: none (using auth plugins)`,
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
