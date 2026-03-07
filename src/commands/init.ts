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
import { detectOpenCode, writeOpenCodeConfig, mergeProfile, findOpencodeConfig, checkOhMyOpenCode } from '../core/opencode.ts';
import { profiles, getProfile } from '../data/profiles.ts';
import { detectStack, suggestLSPs } from '../utils/detect.ts';
import { lspServers } from '../data/lsp-registry.ts';
import { mcpServers } from '../data/mcp-registry.ts';
import { resolveLaunchboardDir } from '../utils/launchboard-resolver.ts';

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
          // Resolve launchboard dir — checks package location, persistent ~/.omocs/launchboard, or auto-clones from GitHub
          const lbResult = resolveLaunchboardDir();
          const lbDir = lbResult.dir;

          if (!lbDir) {
            info(lbResult.message || 'Launchboard package not found. Skipping.');
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
        // Step 5: Provider Authentication
        // ═══════════════════════════════════════════════════════════
        heading('Step 5: Provider Authentication');
        info('Configure your subscriptions for oh-my-opencode.');

        // Ask subscription questions
        const { hasClaude } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasClaude',
          message: 'Do you have a Claude Pro/Max subscription?',
          default: false,
        }]);

        let claudeFlag = 'no';
        if (hasClaude) {
          const { isMax20 } = await inquirer.prompt([{
            type: 'confirm',
            name: 'isMax20',
            message: 'Are you on max20 (20x mode)?',
            default: false,
          }]);
          claudeFlag = isMax20 ? 'max20' : 'yes';
        }

        const { hasOpenAI } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasOpenAI',
          message: 'Do you have a ChatGPT Plus subscription?',
          default: false,
        }]);

        const { hasGemini } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasGemini',
          message: 'Do you want to integrate Gemini models?',
          default: false,
        }]);

        const { hasCopilot } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasCopilot',
          message: 'Do you have a GitHub Copilot subscription?',
          default: false,
        }]);

        const { hasOpenCodeZen } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasOpenCodeZen',
          message: 'Do you have access to OpenCode Zen?',
          default: false,
        }]);

        const { hasZai } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasZai',
          message: 'Do you have a Z.ai Coding Plan subscription?',
          default: false,
        }]);

        // Build and run oh-my-opencode install command
        const omoFlags = [
          `--claude=${claudeFlag}`,
          `--openai=${hasOpenAI ? 'yes' : 'no'}`,
          `--gemini=${hasGemini ? 'yes' : 'no'}`,
          `--copilot=${hasCopilot ? 'yes' : 'no'}`,
          `--opencode-zen=${hasOpenCodeZen ? 'yes' : 'no'}`,
          `--zai-coding-plan=${hasZai ? 'yes' : 'no'}`,
        ].join(' ');

        const omoInstallSpinner = ora('Running oh-my-opencode installer...').start();
        try {
          try {
            execSync(`bunx oh-my-opencode install --no-tui ${omoFlags}`, { stdio: 'pipe', timeout: 120000 });
          } catch {
            // Fallback to npx if bunx fails
            execSync(`npx oh-my-opencode install --no-tui ${omoFlags}`, { stdio: 'pipe', timeout: 120000 });
          }
          omoInstallSpinner.succeed('oh-my-opencode configured');
        } catch {
          omoInstallSpinner.warn('oh-my-opencode installer failed — you can run it manually later');
        }

        // If Gemini selected, add opencode-antigravity-auth plugin
        const installedAuthPlugins: string[] = [];
        if (hasGemini) {
          const geminiSpinner = ora('Installing opencode-antigravity-auth...').start();
          try {
            const opencodeConfigPath = findOpencodeConfig();
            let opencodeConfig: Record<string, any> = {};
            if (existsSync(opencodeConfigPath)) {
              opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8'));
            }
            if (!opencodeConfig.plugin) opencodeConfig.plugin = [];
            if (!opencodeConfig.plugin.includes('opencode-antigravity-auth@latest')) {
              opencodeConfig.plugin.push('opencode-antigravity-auth@latest');
            }
            const configDir = dirname(opencodeConfigPath);
            if (!existsSync(configDir)) {
              mkdirSync(configDir, { recursive: true });
            }
            writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
            installedAuthPlugins.push('opencode-antigravity-auth');
            geminiSpinner.succeed('Auth plugin registered in opencode.json');
          } catch {
            geminiSpinner.warn('Could not register opencode-antigravity-auth — add manually to opencode.json');
          }
        }

        // Collect configured providers for summary
        const configuredProviders: string[] = [];
        if (hasClaude) configuredProviders.push(`Claude (${claudeFlag === 'max20' ? 'max20' : 'standard'})`);
        if (hasOpenAI) configuredProviders.push('ChatGPT Plus');
        if (hasGemini) configuredProviders.push('Gemini');
        if (hasCopilot) configuredProviders.push('GitHub Copilot');
        if (hasOpenCodeZen) configuredProviders.push('OpenCode Zen');
        if (hasZai) configuredProviders.push('Z.ai Coding Plan');

        // Show next steps
        if (configuredProviders.length > 0) {
          info('');
          info(chalk.cyan('Next steps: Run `opencode auth login` to authenticate each provider:'));
          for (const provider of configuredProviders) {
            info(`  ${icons.check} ${provider}`);
          }
        }

        // ═══════════════════════════════════════════════════════════
        // Step 6: Choose Profile
        // ═══════════════════════════════════════════════════════════
        heading('Step 6: Choose Profile');

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
        // Step 7: Project Detection
        // ═══════════════════════════════════════════════════════════
        heading('Step 7: Project Detection');

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
        // Step 8: MCP Tools
        // ═══════════════════════════════════════════════════════════
        heading('Step 8: MCP Tools');

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
        // Step 9: Saving Configuration
        // ═══════════════════════════════════════════════════════════
        heading('Step 9: Saving Configuration');

        const saveSpinner = ora('Saving configuration...').start();

        // Save OMOCS config
        ensureConfigDir();
        const config = await readConfig();
        config.activeProfile = selectedProfile;
        config.activeAgent = 'sisyphus';
        config.preferences = {
          autoRotate: configuredProviders.length > 1,
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
          configuredProviders.length > 0
            ? `${icons.check} Providers: ${chalk.bold(configuredProviders.join(', '))}`
            : `${icons.cross} Providers: none configured`,
          installedAuthPlugins.length > 0
            ? `${icons.check} Auth plugins: ${chalk.bold(installedAuthPlugins.join(', '))}`
            : '',
          setupLaunchboard ? `${icons.check} Launchboard: ${chalk.bold('ready')} (omocs lb start)` : `${icons.cross} Launchboard: skipped`,
          `${icons.check} Profile: ${chalk.bold(profile.name)}`,
          `${icons.check} Coder model: ${chalk.bold(profile.agents.coder)}`,
          `${icons.check} Task model: ${chalk.bold(profile.agents.task)}`,
          `${icons.check} MCP tools: ${chalk.bold(installMcps.length.toString())} selected`,
          '',
          `${chalk.gray('Config:')} ~/.omocs/config.json`,
          `${chalk.gray('OpenCode:')} .opencode.json`,
          '',
          configuredProviders.length > 0
            ? `Next: Run ${chalk.cyan('opencode auth login')} to authenticate your providers.`
            : `Next: Run ${chalk.cyan('omocs doctor')} to verify your setup.`,
        ].filter(Boolean);

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
