import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { heading, success, fail, warn, info, icons, handleError, createTable, successBox, infoBox } from '../utils/ui.ts';
import { readConfig } from '../core/config.ts';
import { profiles, profilesList, getProfile, type Profile } from '../data/profiles.ts';
import { agents, type AgentRole } from '../data/agents.ts';

// ─── Model cost data ($ per 1M tokens) ──────────────────────────────
interface ModelPricing {
  input: number;   // per 1M input tokens
  output: number;  // per 1M output tokens
  label: string;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude family
  'claude-opus-4-6':           { input: 15,    output: 75,    label: 'Claude Opus 4.6' },
  'claude-opus-4.6':           { input: 15,    output: 75,    label: 'Claude Opus 4.6' },
  'claude-opus-4-6-thinking':  { input: 15,    output: 75,    label: 'Claude Opus 4.6 (Thinking)' },
  'claude-sonnet-4-6':         { input: 3,     output: 15,    label: 'Claude Sonnet 4.6' },
  'claude-sonnet-4.6':         { input: 3,     output: 15,    label: 'Claude Sonnet 4.6' },
  'claude-sonnet-4-5':         { input: 3,     output: 15,    label: 'Claude Sonnet 4.5' },
  'claude-haiku-3.5':          { input: 0.25,  output: 1.25,  label: 'Claude Haiku 3.5' },
  'claude-3.5-haiku':          { input: 0.25,  output: 1.25,  label: 'Claude Haiku 3.5' },

  // GPT family
  'gpt-5.3-codex':             { input: 2,     output: 8,     label: 'GPT-5.3 Codex' },
  'gpt-5.4':                   { input: 2.5,   output: 10,    label: 'GPT-5.4' },
  'gpt-4o':                    { input: 2.5,   output: 10,    label: 'GPT-4o' },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60,  label: 'GPT-4o Mini' },

  // Gemini family
  'gemini-3.1-pro':            { input: 1.25,  output: 5,     label: 'Gemini 3.1 Pro' },
  'gemini-2.5-pro':            { input: 1.25,  output: 10,    label: 'Gemini 2.5 Pro' },
  'gemini-2.5':                { input: 1.25,  output: 10,    label: 'Gemini 2.5' },
  'gemini-2.5-flash':          { input: 0.15,  output: 0.60,  label: 'Gemini 2.5 Flash' },

  // Others
  'kimi-k2.5':                 { input: 0.60,  output: 2.40,  label: 'Kimi K2.5' },
  'kimi-k2':                   { input: 0.60,  output: 2.40,  label: 'Kimi K2' },
  'deepseek-v3':               { input: 0.27,  output: 1.10,  label: 'DeepSeek V3' },
  'deepseek-r1':               { input: 0.55,  output: 2.19,  label: 'DeepSeek R1' },
};

// Default cost assumption for unknown models
const DEFAULT_PRICING: ModelPricing = { input: 3, output: 15, label: 'Unknown Model' };

// Average tokens per agent invocation
const AVG_INPUT_TOKENS = 2000;
const AVG_OUTPUT_TOKENS = 1000;
const AVG_INVOCATIONS_PER_HOUR = 15; // ~1 invocation every 4 minutes

function findPricing(modelString: string): ModelPricing {
  const lower = modelString.toLowerCase();

  // Direct match
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (lower.includes(key.toLowerCase())) {
      return pricing;
    }
  }

  // Fuzzy match by known keywords
  if (lower.includes('opus')) return MODEL_PRICING['claude-opus-4-6'] || DEFAULT_PRICING;
  if (lower.includes('sonnet')) return MODEL_PRICING['claude-sonnet-4-6'] || DEFAULT_PRICING;
  if (lower.includes('haiku')) return MODEL_PRICING['claude-haiku-3.5'] || DEFAULT_PRICING;
  if (lower.includes('gpt-5.3') || lower.includes('codex')) return MODEL_PRICING['gpt-5.3-codex'] || DEFAULT_PRICING;
  if (lower.includes('gpt-5.4') || lower.includes('gpt-4o')) return MODEL_PRICING['gpt-5.4'] || DEFAULT_PRICING;
  if (lower.includes('gemini') && lower.includes('flash')) return MODEL_PRICING['gemini-2.5-flash'] || DEFAULT_PRICING;
  if (lower.includes('gemini')) return MODEL_PRICING['gemini-3.1-pro'] || DEFAULT_PRICING;
  if (lower.includes('kimi')) return MODEL_PRICING['kimi-k2.5'] || DEFAULT_PRICING;
  if (lower.includes('deepseek') && lower.includes('r1')) return MODEL_PRICING['deepseek-r1'] || DEFAULT_PRICING;
  if (lower.includes('deepseek')) return MODEL_PRICING['deepseek-v3'] || DEFAULT_PRICING;

  return { ...DEFAULT_PRICING, label: modelString };
}

function calculateCostPerInvocation(pricing: ModelPricing): number {
  return (AVG_INPUT_TOKENS / 1_000_000) * pricing.input + (AVG_OUTPUT_TOKENS / 1_000_000) * pricing.output;
}

function formatCurrency(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

interface AgentCostBreakdown {
  agentName: string;
  agentEmoji: string;
  model: string;
  modelLabel: string;
  costPerInvocation: number;
  costPerHour: number;
  costPerDay: number;
}

function getProfileCosts(profile: Profile, hours: number): AgentCostBreakdown[] {
  const breakdowns: AgentCostBreakdown[] = [];

  // Get unique agent-model mappings from the profile
  const agentModels = new Map<string, string>();

  // Start with profile's primary model as default
  const primaryModel = profile.models.primary;

  // Apply agent overrides
  for (const [agentId, override] of Object.entries(profile.agentOverrides)) {
    agentModels.set(agentId, override.model);
  }

  // For agents not in overrides, use primary model
  for (const [agentId, agent] of Object.entries(agents)) {
    if (!agentModels.has(agentId)) {
      agentModels.set(agentId, primaryModel);
    }
  }

  for (const [agentId, model] of agentModels) {
    const agent = agents[agentId];
    if (!agent) continue;

    const pricing = findPricing(model);
    const costPerInvocation = calculateCostPerInvocation(pricing);
    const costPerHour = costPerInvocation * AVG_INVOCATIONS_PER_HOUR;
    const costPerDay = costPerHour * hours;

    breakdowns.push({
      agentName: agent.name,
      agentEmoji: agent.emoji,
      model,
      modelLabel: pricing.label,
      costPerInvocation,
      costPerHour,
      costPerDay,
    });
  }

  // Sort by cost descending
  breakdowns.sort((a, b) => b.costPerHour - a.costPerHour);

  return breakdowns;
}

function showProfileCost(profile: Profile, hours: number): void {
  const breakdowns = getProfileCosts(profile, hours);

  heading(`💰 ${profile.name} [${profile.scope}]`);
  info(profile.description);
  console.log('');

  // Summary
  const totalPerHour = breakdowns.reduce((sum, b) => sum + b.costPerHour, 0);
  const avgPerHour = totalPerHour / breakdowns.length;
  const totalPerDay = avgPerHour * hours; // Use avg since not all agents run simultaneously

  successBox(`Cost Estimate — ${hours}h workday`, [
    `${chalk.gray('Avg cost/hour:')}  ${chalk.bold.green(formatCurrency(avgPerHour))}`,
    `${chalk.gray(`Est. ${hours}h day:`)}    ${chalk.bold.green(formatCurrency(totalPerDay))}`,
    `${chalk.gray('Per invocation:')} ${chalk.bold(formatCurrency(breakdowns[0]?.costPerInvocation || 0))} (most expensive agent)`,
    `${chalk.gray('Assumptions:')}    ~${AVG_INPUT_TOKENS} input / ~${AVG_OUTPUT_TOKENS} output tokens per call`,
    `${chalk.gray('               ')} ~${AVG_INVOCATIONS_PER_HOUR} invocations/hour`,
  ].join('\n'));

  // Per-agent breakdown table
  heading('Per-Agent Breakdown');

  const rows = breakdowns.slice(0, 15).map(b => [
    `${b.agentEmoji} ${b.agentName}`,
    b.modelLabel,
    formatCurrency(b.costPerInvocation),
    formatCurrency(b.costPerHour),
    formatCurrency(b.costPerHour * hours),
  ]);

  console.log(createTable(
    ['Agent', 'Model', '/Invocation', '/Hour', `/${hours}h`],
    rows,
  ));

  if (breakdowns.length > 15) {
    info(`...and ${breakdowns.length - 15} more agents`);
  }
}

export function registerCostCommand(program: Command): void {
  program
    .command('cost')
    .description('Estimate cost per hour/day based on profile model assignments')
    .argument('[profile]', 'Profile name (default: active profile)')
    .option('--hours <n>', 'Hours per workday for projection', '8')
    .option('--compare <profile>', 'Compare with another profile')
    .action(async (profileName: string | undefined, options: { hours?: string; compare?: string }) => {
      try {
        const hours = parseInt(options.hours || '8', 10);

        heading('💰 Profile Cost Calculator');
        info(`Projection: ${chalk.bold(String(hours))}h workday`);
        console.log('');

        // Resolve primary profile
        let primaryProfileName = profileName;
        if (!primaryProfileName) {
          const config = readConfig();
          primaryProfileName = config.activeProfile || 'balanced';
        }

        const primaryProfile = getProfile(primaryProfileName);
        if (!primaryProfile) {
          fail(`Profile '${primaryProfileName}' not found.`);
          info(`Available profiles: ${profilesList.map(p => p.name).join(', ')}`);
          return;
        }

        showProfileCost(primaryProfile, hours);

        // Compare mode
        if (options.compare) {
          const compareProfile = getProfile(options.compare);
          if (!compareProfile) {
            fail(`Comparison profile '${options.compare}' not found.`);
            info(`Available profiles: ${profilesList.map(p => p.name).join(', ')}`);
            return;
          }

          console.log('');
          showProfileCost(compareProfile, hours);

          // Show comparison summary
          console.log('');
          heading('📊 Comparison');

          const primaryCosts = getProfileCosts(primaryProfile, hours);
          const compareCosts = getProfileCosts(compareProfile, hours);

          const primaryAvg = primaryCosts.reduce((s, b) => s + b.costPerHour, 0) / primaryCosts.length;
          const compareAvg = compareCosts.reduce((s, b) => s + b.costPerHour, 0) / compareCosts.length;

          const diff = compareAvg - primaryAvg;
          const pctDiff = ((diff / primaryAvg) * 100);

          const rows = [
            [primaryProfile.name, formatCurrency(primaryAvg), formatCurrency(primaryAvg * hours)],
            [compareProfile.name, formatCurrency(compareAvg), formatCurrency(compareAvg * hours)],
          ];

          console.log(createTable(
            ['Profile', 'Avg $/Hour', `${hours}h Total`],
            rows,
          ));

          const diffStr = diff > 0
            ? chalk.red(`+${formatCurrency(Math.abs(diff))}/h (+${pctDiff.toFixed(1)}%)`)
            : chalk.green(`${formatCurrency(Math.abs(diff))}/h (${pctDiff.toFixed(1)}%)`);

          console.log(`\n  ${icons.arrow} ${chalk.bold(compareProfile.name)} is ${diffStr} compared to ${chalk.bold(primaryProfile.name)}`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
