import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readConfig, setActiveAgent } from '../core/config.ts';
import { agents, getAgent, listAgentIds, loadAgentPrompt } from '../data/agents.ts';
import { customAgentsStore, type CustomAgent } from '../core/store.ts';
import { createTable, heading, success, fail, warn, info, icons, handleError, infoBox } from '../utils/ui.ts';

export function registerAgentCommand(program: Command): void {
  const agent = program
    .command('agent')
    .description('Manage agent roles');

  // ─── agent list ────────────────────────────────────────────────────
  agent
    .command('list')
    .description('List all available agents')
    .action(async () => {
      try {
        const config = await readConfig();
        heading('🤖 Available Agents');

        const rows: (string | number)[][] = [];
        for (const [id, ag] of Object.entries(agents)) {
          const active = config.activeAgent === id ? chalk.green('● active') : '';
          rows.push([
            `${ag.emoji} ${active ? chalk.bold.green(id) : id}`,
            ag.name,
            ag.description,
            ag.preferredModel,
            active,
          ]);
        }

        // Add custom agents
        const custom = await customAgentsStore.read();
        for (const [id, ag] of Object.entries(custom.agents)) {
          const active = config.activeAgent === id ? chalk.green('● active') : '';
          rows.push([
            `🔧 ${active ? chalk.bold.green(id) : chalk.italic(id)}`,
            ag.name + chalk.gray(' (custom)'),
            ag.description,
            ag.preferredModel,
            active,
          ]);
        }

        console.log(createTable(
          ['ID', 'Name', 'Description', 'Model', 'Status'],
          rows
        ));

        console.log(`\n  Active: ${chalk.bold.green(config.activeAgent)}`);
        console.log(`  Total: ${chalk.bold(Object.keys(agents).length.toString())} built-in + ${chalk.bold(Object.keys(custom.agents).length.toString())} custom`);
        console.log(`  Switch: ${chalk.cyan('omocs agent use <id>')}\n`);
      } catch (error) {
        handleError(error);
      }
    });

  // ─── agent use ─────────────────────────────────────────────────────
  agent
    .command('use')
    .description('Switch to a different agent')
    .argument('[id]', 'Agent ID')
    .action(async (id?: string) => {
      try {
        if (!id) {
          const custom = await customAgentsStore.read();
          const choices = [
            ...Object.entries(agents).map(([k, a]) => ({
              name: `${a.emoji} ${a.name} — ${a.description}`,
              value: k,
            })),
            ...Object.entries(custom.agents).map(([k, a]) => ({
              name: `🔧 ${a.name} (custom) — ${a.description}`,
              value: k,
            })),
          ];
          const result = await inquirer.prompt([{
            type: 'list',
            name: 'id',
            message: 'Select agent:',
            choices,
          }]);
          id = result.id;
        }

        const ag = getAgent(id!);
        const custom = await customAgentsStore.read();
        const customAg = custom.agents[id!];

        if (!ag && !customAg) {
          fail(`Agent '${id}' not found. Run \`omocs agent list\` to see available agents.`);
          return;
        }

        await setActiveAgent(id!);
        const name = ag?.name || customAg?.name || id;
        success(`Switched to agent: ${name}`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── agent create ──────────────────────────────────────────────────
  agent
    .command('create')
    .description('Create a custom agent')
    .action(async () => {
      try {
        heading('✨ Create Custom Agent');

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'id',
            message: 'Agent ID (lowercase, no spaces):',
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
            name: 'preferredModel',
            message: 'Preferred model:',
            default: 'claude-4-sonnet',
          },
          {
            type: 'editor',
            name: 'systemPrompt',
            message: 'System prompt (opens editor):',
          },
          {
            type: 'input',
            name: 'tools',
            message: 'Tools (comma-separated):',
            default: 'read,write,execute',
          },
        ]);

        const newAgent: CustomAgent = {
          name: answers.name,
          description: answers.description,
          systemPrompt: answers.systemPrompt,
          preferredModel: answers.preferredModel,
          tools: answers.tools.split(',').map((t: string) => t.trim()),
          createdAt: new Date().toISOString(),
        };

        await customAgentsStore.update(store => {
          store.agents[answers.id] = newAgent;
        });

        success(`Agent '${answers.id}' created!`);
        info(`Use it: ${chalk.cyan(`omocs agent use ${answers.id}`)}`);
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });

  // ─── agent info ────────────────────────────────────────────────────
  agent
    .command('info')
    .description('Show detailed info about an agent')
    .argument('[id]', 'Agent ID')
    .action(async (id?: string) => {
      try {
        if (!id) {
          const choices = Object.entries(agents).map(([k, a]) => ({
            name: `${a.emoji} ${a.name}`,
            value: k,
          }));
          const result = await inquirer.prompt([{
            type: 'list',
            name: 'id',
            message: 'Select agent:',
            choices,
          }]);
          id = result.id;
        }

        const ag = getAgent(id!);
        if (!ag) {
          // Check custom
          const custom = await customAgentsStore.read();
          const customAg = custom.agents[id!];
          if (customAg) {
            infoBox(`🔧 ${customAg.name} (custom)`, [
              `${chalk.gray('Description:')} ${customAg.description}`,
              `${chalk.gray('Model:')} ${customAg.preferredModel}`,
              `${chalk.gray('Tools:')} ${customAg.tools.join(', ')}`,
              `${chalk.gray('Created:')} ${customAg.createdAt}`,
              '',
              chalk.gray('System Prompt:'),
              customAg.systemPrompt.substring(0, 500) + (customAg.systemPrompt.length > 500 ? '...' : ''),
            ].join('\n'));
            return;
          }
          fail(`Agent '${id}' not found.`);
          return;
        }

        const prompt = await loadAgentPrompt(ag);

        infoBox(`${ag.emoji} ${ag.name}`, [
          `${chalk.gray('ID:')} ${ag.id}`,
          `${chalk.gray('Description:')} ${ag.description}`,
          `${chalk.gray('Model:')} ${ag.preferredModel}`,
          `${chalk.gray('Tools:')} ${ag.tools.join(', ')}`,
          `${chalk.gray('Tags:')} ${ag.tags.join(', ')}`,
          '',
          chalk.gray('System Prompt Preview:'),
          prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
        ].join('\n'));
      } catch (error) {
        if ((error as any)?.name === 'ExitPromptError') return;
        handleError(error);
      }
    });
}
