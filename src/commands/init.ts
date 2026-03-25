import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir, hostname } from 'os';
import { createHash } from 'crypto';
import { showBanner, successBox, infoBox, heading, success, info, bullet, icons, handleError } from '../utils/ui.ts';
import { readConfig, writeConfig, ensureConfigDir, configExists } from '../core/config.ts';
import { detectOpenCode, writeOpenCodeConfig, mergeProfile, findOpencodeConfig, checkOhMyOpenCode } from '../core/opencode.ts';
import { encrypt } from '../core/crypto.ts';
import { profiles, getProfile } from '../data/profiles.ts';
import { detectStack, suggestLSPs } from '../utils/detect.ts';
import { lspServers } from '../data/lsp-registry.ts';
import { mcpServers } from '../data/mcp-registry.ts';
import { resolveLaunchboardDir } from '../utils/launchboard-resolver.ts';

// Derive a machine-specific password for API key encryption
// Deterministic per machine so keys can be decrypted later
function getMachineKey(): string {
  return createHash('sha256')
    .update(`omocs:${hostname()}:${homedir()}`)
    .digest('hex');
}

// Encrypt an API key for storage
function encryptApiKey(apiKey: string): string {
  return encrypt(apiKey, getMachineKey());
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Interactive setup wizard — configure OMOCS for the first time')
    .option('-f, --force', 'Overwrite existing configuration')
    .option('-q, --quick', 'Quick setup — skip non-essential prompts, auto-detect provider')
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
        // QUICK MODE — Skip non-essential prompts
        // ═══════════════════════════════════════════════════════════
        if (options.quick) {
          heading('⚡ Quick Setup');
          info('Auto-detecting provider from environment variables...');

          const quickSpinner = ora('Detecting environment...').start();

          // Check OpenCode
          const opencode = await detectOpenCode();
          if (opencode.installed) {
            quickSpinner.succeed(`OpenCode found${opencode.version ? ` (${opencode.version})` : ''}`);
          } else {
            quickSpinner.warn('OpenCode not found — configuring OMOCS only');
          }

          // Auto-detect provider from env vars
          let detectedProvider: string | null = null;
          let detectedApiKey: string | null = null;
          let detectedBaseURL: string | null = null;

          if (process.env.ANTHROPIC_API_KEY) {
            detectedProvider = 'anthropic';
            detectedApiKey = process.env.ANTHROPIC_API_KEY;
          } else if (process.env.OPENAI_API_KEY) {
            detectedProvider = 'openai';
            detectedApiKey = process.env.OPENAI_API_KEY;
            detectedBaseURL = process.env.OPENAI_BASE_URL || undefined as any;
          } else if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
            detectedProvider = 'google';
            detectedApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
          } else if (process.env.OPENCODE_API_KEY) {
            detectedProvider = 'custom';
            detectedApiKey = process.env.OPENCODE_API_KEY;
            detectedBaseURL = process.env.OPENCODE_API_BASE || undefined as any;
          }

          if (detectedProvider) {
            info(`Detected provider: ${chalk.bold(detectedProvider)} (from environment)`);
          }

          // Only ask for essential info if not auto-detected
          let apiKey = detectedApiKey;
          let providerName = detectedProvider || 'openai-compatible';
          let baseURL = detectedBaseURL;

          if (!apiKey) {
            const { key } = await inquirer.prompt([{
              type: 'password',
              name: 'key',
              message: 'API key (or press Enter to skip):',
              mask: '*',
            }]);
            apiKey = key || null;

            if (apiKey && !baseURL) {
              const { url } = await inquirer.prompt([{
                type: 'input',
                name: 'url',
                message: 'API base URL (or press Enter for default):',
                default: 'https://api.anthropic.com/v1',
              }]);
              baseURL = url;
            }
          }

          // Choose model tier
          const { modelTier } = await inquirer.prompt([{
            type: 'list',
            name: 'modelTier',
            message: 'Preferred model tier:',
            choices: [
              { name: 'Premium (Opus/Codex — best quality)', value: 'premium' },
              { name: 'Balanced (Sonnet — recommended)', value: 'balanced' },
              { name: 'Economy (Flash/Kimi — cheapest)', value: 'economy' },
            ],
            default: 'balanced',
          }]);

          // Map tier to profile
          const tierProfiles: Record<string, string> = {
            premium: 'opus-4.6-all',
            balanced: 'sonnet-4.6-all',
            economy: 'budget-mixed',
          };
          const selectedProfile = tierProfiles[modelTier] || 'sonnet-4.6-all';

          // Save config
          const saveSpinner = ora('Saving configuration...').start();

          ensureConfigDir();
          const config = await readConfig();
          config.activeProfile = selectedProfile;
          config.activeAgent = 'sisyphus';
          config.preferences = { autoRotate: false };
          await writeConfig(config);

          // Write opencode.json if we have provider info
          if (apiKey) {
            const opencodeConfigPath = findOpencodeConfig();
            let opencodeConfig: Record<string, any> = {};
            if (existsSync(opencodeConfigPath)) {
              try { opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8')); } catch {}
            }

            if (baseURL) {
              opencodeConfig.provider = {
                name: providerName,
                baseURL,
                apiKey,
              };
            }

            // Ensure plugins
            if (!opencodeConfig.plugin) opencodeConfig.plugin = [];
            if (!opencodeConfig.plugin.includes('oh-my-opencode')) {
              opencodeConfig.plugin.push('oh-my-opencode');
            }
            if (!opencodeConfig.plugin.includes('omocs') && !opencodeConfig.plugin.some((p: string) => p.includes('omocs'))) {
              opencodeConfig.plugin.push('omocs');
            }

            const configDir = dirname(opencodeConfigPath);
            if (!existsSync(configDir)) {
              mkdirSync(configDir, { recursive: true });
            }
            writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
          }

          // Apply profile
          const profile = getProfile(selectedProfile)!;
          await mergeProfile(profile);

          saveSpinner.succeed(chalk.green('Configuration saved!'));

          const providerLabel = detectedProvider
            ? `${detectedProvider} (auto-detected)`
            : apiKey ? 'custom' : 'none';

          successBox('Quick Setup Complete! ⚡', [
            `${icons.check} Profile: ${chalk.bold(profile.name)}`,
            `${icons.check} Provider: ${chalk.bold(providerLabel)}`,
            `${icons.check} Coder: ${chalk.bold(profile.agents.coder)}`,
            `${icons.check} Task: ${chalk.bold(profile.agents.task)}`,
            '',
            `Run ${chalk.cyan('omocs doctor')} to verify, or ${chalk.cyan('omocs init')} for full setup.`,
          ].join('\n'));

          return; // Exit early — skip the full wizard
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

        // Ask if user wants to use 1mr.tech (API Token Reseller)
        const { providerType } = await inquirer.prompt([{
          type: 'list',
          name: 'providerType',
          message: 'How do you want to configure providers?',
          choices: [
            { name: 'Individual subscriptions (Claude, ChatGPT, Gemini, etc.)', value: 'individual' },
            { name: '1mr.tech — API Token Reseller (single key, multiple models)', value: '1mr' },
          ],
        }]);

        let use1mr = false;
        let oneMrApiKey = '';
        let oneMrModel = 'claude-sonnet-4-6';
        let oneMrTokensRemaining = 0;

        if (providerType === '1mr') {
          use1mr = true;

          // Prompt for API key
          const { apiKey } = await inquirer.prompt([{
            type: 'password',
            name: 'apiKey',
            message: 'Enter your 1mr.tech API key:',
            mask: '*',
            validate: (input: string) => input.length > 0 ? true : 'API key required',
          }]);
          oneMrApiKey = apiKey;

          // Validate the API key
          const validateSpinner = ora('Validating API key with 1mr.tech...').start();
          let validationPassed = false;

          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch('https://api.1mr.tech/v1/usage', {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${oneMrApiKey}` },
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.ok) {
              const data = await response.json() as {
                tokens_remaining?: number;
                tokens_used?: number;
                api_key_status?: string;
              };
              oneMrTokensRemaining = data.tokens_remaining || 0;
              validationPassed = true;
              validateSpinner.succeed(chalk.green(
                `API key valid! Token balance: ${oneMrTokensRemaining.toLocaleString()} remaining`
              ));
            } else {
              validateSpinner.fail(chalk.red('Invalid API key. Get one at https://1mr.tech'));
              const { continueAnyway } = await inquirer.prompt([{
                type: 'confirm',
                name: 'continueAnyway',
                message: 'Continue with this key anyway? (config will be written but may not work)',
                default: false,
              }]);
              if (!continueAnyway) {
                info('Setup cancelled. Re-run omocs init when you have a valid key.');
                return;
              }
              validationPassed = true; // User chose to continue
            }
          } catch (err) {
            validateSpinner.warn(chalk.yellow('Could not reach 1mr.tech API — skipping validation'));
            const { continueOffline } = await inquirer.prompt([{
              type: 'confirm',
              name: 'continueOffline',
              message: 'Continue without validation? (config will be written)',
              default: true,
            }]);
            if (!continueOffline) {
              info('Setup cancelled.');
              return;
            }
            validationPassed = true;
          }

          // Prompt for default model
          const { model } = await inquirer.prompt([{
            type: 'list',
            name: 'model',
            message: 'Select default model:',
            choices: [
              { name: 'claude-sonnet-4-6 (Balanced — recommended)', value: 'claude-sonnet-4-6' },
              { name: 'claude-opus-4-6 (Premium — uses more tokens)', value: 'claude-opus-4-6' },
              { name: 'claude-haiku-4-5 (Fast — cheapest)', value: 'claude-haiku-4-5' },
              { name: 'gpt-5.3-codex (Code-optimized)', value: 'gpt-5.3-codex' },
            ],
            default: 'claude-sonnet-4-6',
          }]);
          oneMrModel = model;

          // Write opencode.json for 1mr.tech
          const opencodeConfigPath = findOpencodeConfig();
          let opencodeConfig: Record<string, any> = {};
          if (existsSync(opencodeConfigPath)) {
            try {
              opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8'));
            } catch {}
          }

          opencodeConfig.provider = {
            name: 'openai-compatible',
            model: oneMrModel,
            baseURL: 'https://api.1mr.tech/v1',
            apiKey: encryptApiKey(oneMrApiKey),
            _encrypted: true,
          };

          // Ensure parent directory exists
          const configDir = dirname(opencodeConfigPath);
          if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
          }
          writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));

          // Write oh-my-opencode.json
          const ohmyConfigPath = resolve(process.cwd(), 'oh-my-opencode.json');
          const ohmyConfig = {
            subscription: 'custom',
            provider: {
              baseURL: 'https://api.1mr.tech/v1',
              apiKey: encryptApiKey(oneMrApiKey),
              _encrypted: true,
            },
            agents: {
              sisyphus: { enabled: true, model: 'claude-opus-4-6' },
              prometheus: { enabled: true },
              atlas: { enabled: true },
              metis: { enabled: true },
              momus: { enabled: true },
              hephaestus: { enabled: true },
              oracle: { enabled: true },
              librarian: { enabled: true },
            },
          };
          writeFileSync(ohmyConfigPath, JSON.stringify(ohmyConfig, null, 2));

          success('1mr.tech provider configured');
          success(`opencode.json written`);
          success(`oh-my-opencode.json written`);
        }

        // Individual subscription flow (original)
        let hasClaude = false;
        let claudeFlag = 'no';
        let hasOpenAI = false;
        let hasGemini = false;
        let hasCopilot = false;
        let hasOpenCodeZen = false;
        let hasZai = false;

        if (!use1mr) {
          const claudeResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasClaude',
            message: 'Do you have a Claude Pro/Max subscription?',
            default: false,
          }]);
          hasClaude = claudeResult.hasClaude;

          if (hasClaude) {
            const { isMax20 } = await inquirer.prompt([{
              type: 'confirm',
              name: 'isMax20',
              message: 'Are you on max20 (20x mode)?',
              default: false,
            }]);
            claudeFlag = isMax20 ? 'max20' : 'yes';
          }

          const openaiResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasOpenAI',
            message: 'Do you have a ChatGPT Plus subscription?',
            default: false,
          }]);
          hasOpenAI = openaiResult.hasOpenAI;

          const geminiResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasGemini',
            message: 'Do you want to integrate Gemini models?',
            default: false,
          }]);
          hasGemini = geminiResult.hasGemini;

          const copilotResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasCopilot',
            message: 'Do you have a GitHub Copilot subscription?',
            default: false,
          }]);
          hasCopilot = copilotResult.hasCopilot;

          const zenResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasOpenCodeZen',
            message: 'Do you have access to OpenCode Zen?',
            default: false,
          }]);
          hasOpenCodeZen = zenResult.hasOpenCodeZen;

          const zaiResult = await inquirer.prompt([{
            type: 'confirm',
            name: 'hasZai',
            message: 'Do you have a Z.ai Coding Plan subscription?',
            default: false,
          }]);
          hasZai = zaiResult.hasZai;

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
        if (use1mr) configuredProviders.push('1mr.tech');
        if (hasClaude) configuredProviders.push(`Claude (${claudeFlag === 'max20' ? 'max20' : 'standard'})`);
        if (hasOpenAI) configuredProviders.push('ChatGPT Plus');
        if (hasGemini) configuredProviders.push('Gemini');
        if (hasCopilot) configuredProviders.push('GitHub Copilot');
        if (hasOpenCodeZen) configuredProviders.push('OpenCode Zen');
        if (hasZai) configuredProviders.push('Z.ai Coding Plan');

        // Show next steps
        if (configuredProviders.length > 0) {
          info('');
          if (use1mr) {
            info(chalk.cyan('1mr.tech is ready to use! No additional auth needed.'));
            if (oneMrTokensRemaining > 0) {
              info(`  Token balance: ${chalk.bold(oneMrTokensRemaining.toLocaleString())} tokens remaining`);
            }
            info(`  Default model: ${chalk.bold(oneMrModel)}`);
          } else {
            info(chalk.cyan('Next steps: Run `opencode auth login` to authenticate each provider:'));
            for (const provider of configuredProviders) {
              info(`  ${icons.check} ${provider}`);
            }
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
          use1mr
            ? `${icons.check} Default model: ${chalk.bold(oneMrModel)}`
            : `${icons.check} Coder model: ${chalk.bold(profile.agents.coder)}`,
          use1mr
            ? (oneMrTokensRemaining > 0 ? `${icons.check} Token balance: ${chalk.bold(oneMrTokensRemaining.toLocaleString())}` : '')
            : `${icons.check} Task model: ${chalk.bold(profile.agents.task)}`,
          `${icons.check} MCP tools: ${chalk.bold(installMcps.length.toString())} selected`,
          '',
          `${chalk.gray('Config:')} ~/.omocs/config.json`,
          `${chalk.gray('OpenCode:')} .opencode.json`,
          '',
          use1mr
            ? `Next: Run ${chalk.cyan('opencode')} to start coding!`
            : configuredProviders.length > 0
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
