import { Command } from 'commander';
import chalk from 'chalk';
import { profiles, getProfile, type Profile } from '../data/profiles.ts';
import { customProfilesStore } from '../core/store.ts';
import { heading, fail, info, icons, handleError, createTable } from '../utils/ui.ts';

async function resolveProfile(key: string): Promise<{ profile: Profile; source: string } | null> {
  // Check built-in profiles
  const builtin = getProfile(key);
  if (builtin) return { profile: builtin, source: 'built-in' };

  // Check custom profiles
  const custom = await customProfilesStore.read();
  const cp = custom.profiles[key];
  if (cp) {
    return {
      profile: {
        ...cp,
        scope: 'mixed' as const,
        models: { primary: cp.agents.coder },
        agentOverrides: {},
        categoryOverrides: {},
      } as Profile,
      source: 'custom',
    };
  }

  return null;
}

function diffValue(label: string, val1: string | number | boolean | undefined, val2: string | number | boolean | undefined): string {
  const v1 = val1 !== undefined ? String(val1) : chalk.gray('(not set)');
  const v2 = val2 !== undefined ? String(val2) : chalk.gray('(not set)');

  if (v1 === v2) {
    return `  ${chalk.gray(label.padEnd(25))} ${v1}`;
  }

  return `  ${chalk.yellow(label.padEnd(25))} ${chalk.green(v1)} ${chalk.gray('→')} ${chalk.red(v2)}`;
}

export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Compare two profiles side-by-side')
    .argument('<profile1>', 'First profile key')
    .argument('<profile2>', 'Second profile key')
    .action(async (profile1Key: string, profile2Key: string) => {
      try {
        const p1 = await resolveProfile(profile1Key);
        const p2 = await resolveProfile(profile2Key);

        if (!p1) {
          fail(`Profile '${profile1Key}' not found.`);
          info(`Available: ${Object.keys(profiles).join(', ')}`);
          return;
        }
        if (!p2) {
          fail(`Profile '${profile2Key}' not found.`);
          info(`Available: ${Object.keys(profiles).join(', ')}`);
          return;
        }

        heading(`🔍 Profile Diff: ${chalk.green(profile1Key)} vs ${chalk.red(profile2Key)}`);

        // Legend
        console.log(`  ${chalk.green('■')} = ${profile1Key}   ${chalk.red('■')} = ${profile2Key}   ${chalk.yellow('■')} = different values\n`);

        // ─── Basic Info ──────────────────────────────────────────
        heading('Basic Info');
        console.log(diffValue('Name', p1.profile.name, p2.profile.name));
        console.log(diffValue('Description', p1.profile.description, p2.profile.description));
        console.log(diffValue('Scope', p1.profile.scope, p2.profile.scope));
        console.log(diffValue('Source', p1.source, p2.source));
        console.log('');

        // ─── Agent Model Assignments ──────────────────────────────
        heading('Agent Model Assignments');
        console.log(diffValue('Coder', p1.profile.agents.coder, p2.profile.agents.coder));
        console.log(diffValue('Task', p1.profile.agents.task, p2.profile.agents.task));
        console.log(diffValue('Title', p1.profile.agents.title, p2.profile.agents.title));
        console.log('');

        // ─── Model Configuration ──────────────────────────────────
        if (p1.profile.models || p2.profile.models) {
          heading('Model Configuration');
          const allModelKeys = new Set([
            ...Object.keys(p1.profile.models || {}),
            ...Object.keys(p2.profile.models || {}),
          ]);

          for (const key of Array.from(allModelKeys).sort()) {
            const v1 = (p1.profile.models as Record<string, string>)?.[key];
            const v2 = (p2.profile.models as Record<string, string>)?.[key];
            console.log(diffValue(`models.${key}`, v1, v2));
          }
          console.log('');
        }

        // ─── Settings ──────────────────────────────────────────────
        heading('Settings');
        const allSettingKeys = new Set([
          ...Object.keys(p1.profile.settings || {}),
          ...Object.keys(p2.profile.settings || {}),
        ]);

        for (const key of Array.from(allSettingKeys).sort()) {
          const v1 = (p1.profile.settings as Record<string, unknown>)?.[key];
          const v2 = (p2.profile.settings as Record<string, unknown>)?.[key];
          console.log(diffValue(key, v1 as string, v2 as string));
        }
        console.log('');

        // ─── Agent Overrides ───────────────────────────────────────
        const allAgentKeys = new Set([
          ...Object.keys(p1.profile.agentOverrides || {}),
          ...Object.keys(p2.profile.agentOverrides || {}),
        ]);

        if (allAgentKeys.size > 0) {
          heading('Agent Overrides');

          let diffCount = 0;
          let sameCount = 0;
          const rows: string[] = [];

          for (const agentKey of Array.from(allAgentKeys).sort()) {
            const v1 = p1.profile.agentOverrides?.[agentKey]?.model;
            const v2 = p2.profile.agentOverrides?.[agentKey]?.model;

            if (v1 === v2) {
              sameCount++;
            } else {
              diffCount++;
              rows.push(diffValue(agentKey, v1, v2));
            }
          }

          if (rows.length > 0) {
            for (const row of rows) console.log(row);
          }

          if (sameCount > 0) {
            console.log(chalk.gray(`  ... and ${sameCount} identical agent overrides`));
          }
          console.log('');
        }

        // ─── Category Overrides ────────────────────────────────────
        const allCatKeys = new Set([
          ...Object.keys(p1.profile.categoryOverrides || {}),
          ...Object.keys(p2.profile.categoryOverrides || {}),
        ]);

        if (allCatKeys.size > 0) {
          heading('Category Overrides');

          let diffCount = 0;
          let sameCount = 0;
          const rows: string[] = [];

          for (const catKey of Array.from(allCatKeys).sort()) {
            const v1 = p1.profile.categoryOverrides?.[catKey]?.model;
            const v2 = p2.profile.categoryOverrides?.[catKey]?.model;

            if (v1 === v2) {
              sameCount++;
            } else {
              diffCount++;
              rows.push(diffValue(catKey, v1, v2));
            }
          }

          if (rows.length > 0) {
            for (const row of rows) console.log(row);
          }

          if (sameCount > 0) {
            console.log(chalk.gray(`  ... and ${sameCount} identical category overrides`));
          }
          console.log('');
        }

        // ─── Summary ─────────────────────────────────────────────
        heading('Summary');
        const identical = (
          p1.profile.agents.coder === p2.profile.agents.coder &&
          p1.profile.agents.task === p2.profile.agents.task &&
          p1.profile.agents.title === p2.profile.agents.title
        );

        if (identical) {
          console.log(`  ${icons.check} Core agent models are ${chalk.green('identical')}`);
        } else {
          const diffs: string[] = [];
          if (p1.profile.agents.coder !== p2.profile.agents.coder) diffs.push('coder');
          if (p1.profile.agents.task !== p2.profile.agents.task) diffs.push('task');
          if (p1.profile.agents.title !== p2.profile.agents.title) diffs.push('title');
          console.log(`  ${icons.cross} Core agent models differ in: ${chalk.yellow(diffs.join(', '))}`);
        }
        console.log('');
      } catch (error) {
        handleError(error);
      }
    });
}
