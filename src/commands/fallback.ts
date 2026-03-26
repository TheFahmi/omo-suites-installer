import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { heading, success, fail, warn, info, icons, handleError, infoBox, label, divider } from '../utils/ui.ts';

// ─── Constants ───────────────────────────────────────────────────────
const CONFIG_LOCATIONS = [
  'opencode.json',
  join('.opencode', 'opencode.json'),
  join(homedir(), '.config', 'opencode', 'opencode.json'),
];

// ─── Helpers ─────────────────────────────────────────────────────────
function readJsonSafe(path: string): any {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function findConfig(): { path: string; data: any } | null {
  for (const loc of CONFIG_LOCATIONS) {
    const full = loc.startsWith('/') ? loc : join(process.cwd(), loc);
    if (existsSync(full)) {
      const data = readJsonSafe(full);
      if (data) return { path: full, data };
    }
  }
  return null;
}

interface FallbackEntry {
  provider: string;
  model: string;
  priority: number;
}

function parseFallbackChain(config: any): FallbackEntry[] {
  const chain: FallbackEntry[] = [];

  // Check provider.models with fallback arrays
  if (config.provider && typeof config.provider === 'object') {
    for (const [providerName, providerConfig] of Object.entries(config.provider)) {
      const pc = providerConfig as any;
      if (pc.models && typeof pc.models === 'object') {
        for (const [modelName, modelConfig] of Object.entries(pc.models)) {
          const mc = modelConfig as any;
          if (mc.fallback && Array.isArray(mc.fallback)) {
            // Has explicit fallback chain
            chain.push({ provider: providerName, model: modelName, priority: 0 });
            mc.fallback.forEach((fb: any, idx: number) => {
              const fbProvider = fb.provider || providerName;
              const fbModel = fb.model || modelName;
              chain.push({ provider: fbProvider, model: fbModel, priority: idx + 1 });
            });
          }
        }
      }
    }
  }

  // Check top-level model fallback configs
  if (config.models && typeof config.models === 'object') {
    for (const [key, val] of Object.entries(config.models)) {
      const v = val as any;
      if (v.fallback) {
        chain.push({ provider: v.provider || '?', model: key, priority: 0 });
        if (Array.isArray(v.fallback)) {
          v.fallback.forEach((fb: any, idx: number) => {
            chain.push({ provider: fb.provider || '?', model: fb.model || fb, priority: idx + 1 });
          });
        }
      }
    }
  }

  return chain;
}

// ─── Register Command ────────────────────────────────────────────────
export function registerFallbackCommand(program: Command): void {
  const fallback = program
    .command('fallback')
    .description('View and edit model fallback chains');

  // fallback show
  fallback
    .command('show')
    .description('Display current model fallback configuration')
    .option('--json', 'Output raw JSON')
    .action((opts) => {
      try {
        heading('🔄 Model Fallback Chains');

        const config = findConfig();
        if (!config) {
          fail('No opencode.json found. Run in your project directory.');
          return;
        }

        info(`Config: ${chalk.gray(config.path)}`);
        console.log('');

        const chain = parseFallbackChain(config.data);

        if (opts.json) {
          console.log(JSON.stringify(chain, null, 2));
          return;
        }

        if (chain.length === 0) {
          // Show raw provider config if no explicit fallback
          if (config.data.provider && typeof config.data.provider === 'object') {
            for (const [name, pc] of Object.entries(config.data.provider)) {
              const provConfig = pc as any;
              console.log(`  ${icons.arrow} ${chalk.bold.cyan(name)}`);
              if (provConfig.models) {
                for (const [model, mc] of Object.entries(provConfig.models)) {
                  const modelConfig = mc as any;
                  const maxTokens = modelConfig.maxTokens ? chalk.gray(` (${modelConfig.maxTokens} tokens)`) : '';
                  console.log(`    ${icons.dot} ${chalk.green(model)}${maxTokens}`);
                }
              }
              console.log('');
            }
            info('No explicit fallback chains configured.');
            info(`Add fallbacks with: ${chalk.cyan('omocs fallback add <model> --fallback <provider>/<model>')}`);
          } else {
            infoBox('No Providers', 'No provider config found in opencode.json.');
          }
          return;
        }

        // Group by primary model
        const groups = new Map<string, FallbackEntry[]>();
        for (const entry of chain) {
          const key = entry.priority === 0 ? `${entry.provider}/${entry.model}` : '';
          if (entry.priority === 0) groups.set(`${entry.provider}/${entry.model}`, [entry]);
        }

        for (const entry of chain) {
          if (entry.priority > 0) {
            // Find which group this belongs to (most recent primary)
            const keys = Array.from(groups.keys());
            const lastKey = keys[keys.length - 1];
            if (lastKey) groups.get(lastKey)!.push(entry);
          }
        }

        for (const [primary, entries] of groups) {
          console.log(`  ${chalk.bold('Chain:')} ${chalk.cyan(primary)}`);
          for (const entry of entries) {
            const icon = entry.priority === 0 ? chalk.green('★') : chalk.gray(`${entry.priority}.`);
            const label = entry.priority === 0 ? 'primary' : `fallback #${entry.priority}`;
            console.log(`    ${icon} ${chalk.bold(`${entry.provider}/${entry.model}`)} ${chalk.dim(`(${label})`)}`);
          }
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // fallback add
  fallback
    .command('add <model>')
    .description('Add a fallback to a model')
    .option('--fallback <provider/model>', 'Fallback provider/model (e.g., openai/gpt-4o)')
    .option('--position <n>', 'Position in chain (default: end)')
    .action((model, opts) => {
      try {
        heading('🔄 Add Fallback');

        if (!opts.fallback) {
          fail('Missing --fallback. Example: omocs fallback add claude-sonnet --fallback openai/gpt-4o');
          return;
        }

        const config = findConfig();
        if (!config) {
          fail('No opencode.json found.');
          return;
        }

        const [fbProvider, fbModel] = opts.fallback.includes('/') 
          ? opts.fallback.split('/')
          : ['unknown', opts.fallback];

        // Find model in config
        let modified = false;
        if (config.data.provider) {
          for (const [provName, provConfig] of Object.entries(config.data.provider)) {
            const pc = provConfig as any;
            if (pc.models && pc.models[model]) {
              if (!pc.models[model].fallback) pc.models[model].fallback = [];
              const entry = { provider: fbProvider, model: fbModel };
              const pos = opts.position ? parseInt(opts.position) - 1 : pc.models[model].fallback.length;
              pc.models[model].fallback.splice(pos, 0, entry);
              modified = true;
              success(`Added ${chalk.cyan(opts.fallback)} as fallback #${pos + 1} for ${chalk.bold(model)}`);
              break;
            }
          }
        }

        if (!modified) {
          fail(`Model "${model}" not found in config. Available models shown with: ${chalk.cyan('omocs fallback show')}`);
          return;
        }

        // Write back
        const { copyFileSync } = require('fs');
        copyFileSync(config.path, config.path + '.bak.' + Date.now());
        writeFileSync(config.path, JSON.stringify(config.data, null, 2) + '\n', 'utf-8');
        info('Backup created. Config updated.');
      } catch (err) { handleError(err); }
    });

  // fallback remove
  fallback
    .command('remove <model>')
    .description('Remove a fallback from a model')
    .option('--position <n>', 'Fallback position to remove (default: last)')
    .action((model, opts) => {
      try {
        heading('🔄 Remove Fallback');

        const config = findConfig();
        if (!config) { fail('No opencode.json found.'); return; }

        let modified = false;
        if (config.data.provider) {
          for (const [, provConfig] of Object.entries(config.data.provider)) {
            const pc = provConfig as any;
            if (pc.models && pc.models[model] && pc.models[model].fallback) {
              const fb = pc.models[model].fallback;
              const pos = opts.position ? parseInt(opts.position) - 1 : fb.length - 1;
              if (pos >= 0 && pos < fb.length) {
                const removed = fb.splice(pos, 1)[0];
                success(`Removed fallback #${pos + 1}: ${removed.provider}/${removed.model}`);
                modified = true;
              } else {
                fail(`Invalid position. Chain has ${fb.length} fallback(s).`);
              }
              break;
            }
          }
        }

        if (!modified) {
          fail(`No fallback chain found for "${model}".`);
          return;
        }

        const { copyFileSync } = require('fs');
        copyFileSync(config.path, config.path + '.bak.' + Date.now());
        writeFileSync(config.path, JSON.stringify(config.data, null, 2) + '\n', 'utf-8');
        info('Config updated.');
      } catch (err) { handleError(err); }
    });

  // Default: show
  fallback.action(() => {
    const config = findConfig();
    heading('🔄 Model Fallback Chains');
    if (!config) {
      infoBox('Fallback Manager', [
        'View and edit model fallback chains.',
        '',
        `  ${chalk.cyan('omocs fallback show')}                          — display chains`,
        `  ${chalk.cyan('omocs fallback add <model> --fallback <p/m>')}  — add fallback`,
        `  ${chalk.cyan('omocs fallback remove <model>')}                — remove fallback`,
      ].join('\n'));
      return;
    }
    // Show providers briefly
    if (config.data.provider) {
      for (const [name, pc] of Object.entries(config.data.provider)) {
        const models = (pc as any).models ? Object.keys((pc as any).models) : [];
        console.log(`  ${icons.arrow} ${chalk.bold.cyan(name)} — ${models.join(', ') || 'no models'}`);
      }
    }
    console.log(`\n  Use ${chalk.cyan('omocs fallback show')} for details.`);
  });
}
