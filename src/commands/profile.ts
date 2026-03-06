import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { readConfig, setActiveProfile } from '../core/config.ts';
import { profiles, getProfile, listProfileKeys } from '../data/profiles.ts';
import { mergeProfile, readOpenCodeConfig } from '../core/opencode.ts';
import { customProfilesStore, type CustomProfile } from '../core/store.ts';
import { createTable, heading, success, fail, warn, info, icons, handleError, successBox, infoBox } from '../utils/ui.ts';

export function registerProfileCommand(program: Command): void {
  const profile = program
    .command('profile')
    .description('Manage model profiles');

  // ─── profile list ──────────────────────────────────────────────────
  profile
    .command('list')
    .description('List all available profiles')
    .action(async () => {
      try {
        const config = await readConfig();
        heading('📋 Available Profiles');

        const rows: (string | number)[][] = [];
        for (const [key, p] of Object.entries(profiles)) {
          const active = config.activeProfile === key ? chalk.green('● active') : '';
          rows.push([
            active ? chalk.bold.green(key) : key,
            p.name,
            p.description,
            p.agents.coder,
            p.agents.task,
            active,
          ]);
        }

        // Add custom profiles
        const custom = await customProfilesStore.read();
        for (const [key, p] of Object.entries(custom.profiles)) {
          const active = config.activeProfile === key ? chalk.green('● active') : '';
          rows.push([
            active ? chalk.bold.green(key) : chalk.italic(key),
            p.name + chalk.gray(' (custom)'),
            p.description,
            p.agents.coder,
            p.agents.task,
            active,
          ]);
        }

        console.log(createTable(
          ['Key', 'Name', 'Description', 'Coder', 'Task', 'Status'],
          rows
        ));

        console.log(`\n  Active: ${chalk.bold.green(config.activeProfile)}`);
        console.log(`  Switch: ${chalk.cyan('omocs profile use <key>')}\n`);
      } catch (error) {
        handleError(error);
      }
    });

  // ─── profile use ───────────────────────────────────────────────────
  profile
    .command('use')
    .description('Switch to a different profile')
    .argument('[key]', 'Profile key')
    .action(async (key?: string) => {
      try {
        if (!key) {
          const allProfiles = { ...profiles };
          const custom = await customProfilesStore.read();
          const choices = [
            ...Object.entries(allProfiles).map(([k, p]) => ({ name: `${p.name} — ${p.description}`, value: k })),
            ...Object.entries(custom.profiles).map(([k, p]) => ({ name: `${p.name} (custom) — ${p.description}`, value: k })),
          ];
          const result = await inquirer.prompt([{
            type: 'list',
            name: 'key',
            message: 'Select profile:',
            choices,
          }]);
          key = result.key;
        }

        // Check built-in profiles
        let selectedProfile = getProfile(key!);
        if (!selectedProfile) {
          // Check custom profiles
          const custom = await customProfilesStore.read();
          const cp = custom.profiles[key!];
          if (cp) {
            selectedProfile = cp;
          }
        }

        if (!selectedProfile) {
          fail(`Profile '${key}' not found. Run \`omocs profile list\` to see available profiles.`);
          return;
        }

        const spinner = ora('Switching profile...').start();

        await setActiveProfile(key!);
        await mergeProfile(selectedProfile);

        spinner.succeed(chalk.green(`Switched to ${selectedProfile.name}`));
        info(`Coder: ${chalk.bold(selectedProfile.agents.coder)}`);
        info(`Task: ${chalk.bold(selectedProfile.agents.task)}`);
        info(`Title: ${chalk.bold(selectedProfile.agents.title)}`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── profile create ────────────────────────────────────────────────
  profile
    .command('create')
    .description('Create a custom profile')
    .action(async () => {
      try {
        heading('✨ Create Custom Profile');

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'key',
            message: 'Profile key (lowercase, no spaces):',
            validate: (input: string) => /^[a-z0-9-]+$/.test(input) ? true : 'Use lowercase letters, numbers, hyphens only',
          },
          {
            type: 'input',
            name: 'name',
            message: 'Display name:',
            validate: (input: string) => input.length > 0 ? true : 'Name required',
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:',
            validate: (input: string) => input.length > 0 ? true : 'Description required',
          },
          {
            type: 'input',
            name: 'coder',
            message: 'Coder model:',
            default: 'claude-4-sonnet',
          },
          {
            type: 'input',
            name: 'task',
            message: 'Task model:',
            default: 'claude-4-sonnet',
          },
          {
            type: 'input',
            name: 'title',
            message: 'Title model:',
            default: 'claude-3.5-haiku',
          },
          {
            type: 'confirm',
            name: 'autoCompact',
            message: 'Enable auto-compact?',
            default: true,
          },
        ]);

        const newProfile: CustomProfile = {
          name: answers.name,
          description: answers.description,
          agents: {
            coder: answers.coder,
            task: answers.task,
            title: answers.title,
          },
          settings: { autoCompact: answers.autoCompact },
          createdAt: new Date().toISOString(),
        };

        await customProfilesStore.update(store => {
          store.profiles[answers.key] = newProfile;
        });

        success(`Profile '${answers.key}' created!`);
        info(`Use it: ${chalk.cyan(`omocs profile use ${answers.key}`)}`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── profile export ────────────────────────────────────────────────
  profile
    .command('export')
    .description('Export current profile as JSON')
    .argument('[key]', 'Profile key (defaults to active)')
    .action(async (key?: string) => {
      try {
        const config = await readConfig();
        const profileKey = key || config.activeProfile;

        let selectedProfile = getProfile(profileKey);
        if (!selectedProfile) {
          const custom = await customProfilesStore.read();
          selectedProfile = custom.profiles[profileKey];
        }

        if (!selectedProfile) {
          fail(`Profile '${profileKey}' not found.`);
          return;
        }

        const exportData = {
          key: profileKey,
          ...selectedProfile,
          exportedAt: new Date().toISOString(),
        };

        console.log(JSON.stringify(exportData, null, 2));
      } catch (error) {
        handleError(error);
      }
    });

  // ─── profile import ────────────────────────────────────────────────
  profile
    .command('import')
    .description('Import a profile from JSON file')
    .argument('<file>', 'Path to JSON file')
    .action(async (file: string) => {
      try {
        const content = await Bun.file(file).text();
        const data = JSON.parse(content);

        if (!data.key || !data.name || !data.agents) {
          fail('Invalid profile format. Required: key, name, agents');
          return;
        }

        const profile: CustomProfile = {
          name: data.name,
          description: data.description || '',
          agents: data.agents,
          settings: data.settings || { autoCompact: true },
          createdAt: new Date().toISOString(),
        };

        await customProfilesStore.update(store => {
          store.profiles[data.key] = profile;
        });

        success(`Profile '${data.key}' imported!`);
      } catch (error) {
        handleError(error);
      }
    });
}
