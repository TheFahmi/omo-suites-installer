import { agents, categoryRouting, getAgentForCategory, listCategories, listAgentIds } from '../data/agents.ts';
import { profilesList, listProfileKeys } from '../data/profiles.ts';
import { mcpServers, listMcpKeys } from '../data/mcp-registry.ts';
import { lspServers, listLspKeys } from '../data/lsp-registry.ts';
import { readConfig, setActiveProfile, configExists } from '../core/config.ts';
import { addMcpToConfig, detectOpenCode } from '../core/opencode.ts';
import { commandExists, getCommandVersion } from '../utils/shell.ts';
import { gold, goldBold, dim, bold, white, green, red, cyan, yellow, gray, modelColor, shortModel } from './utils.ts';

const VERSION = '1.1.0';

// ─── Command List (for autocomplete) ────────────────────────────────
export const COMMAND_LIST = [
  'help', 'test', 'profile', 'profile list', 'profile use ',
  'agent list', 'agent info ', 'agent route ',
  'categories', 'mcp list', 'mcp install ',
  'lsp detect', 'stats', 'version', 'clear', 'quit', 'q',
];

// ─── Autocomplete ────────────────────────────────────────────────────
export function getAutocompleteSuggestions(input: string): string[] {
  const trimmed = input.replace(/^\//, '').toLowerCase();
  if (!trimmed) return COMMAND_LIST.slice(0, 6).map(c => `/${c}`);

  const matches = COMMAND_LIST.filter(cmd =>
    cmd.toLowerCase().startsWith(trimmed) && cmd.toLowerCase() !== trimmed
  );

  // If user is typing a sub-arg, provide specific suggestions
  if (trimmed.startsWith('profile use ')) {
    const partial = trimmed.replace('profile use ', '');
    return listProfileKeys()
      .filter(k => k.toLowerCase().startsWith(partial))
      .map(k => `/profile use ${k}`);
  }
  if (trimmed.startsWith('agent info ')) {
    const partial = trimmed.replace('agent info ', '');
    return listAgentIds()
      .filter(k => k.toLowerCase().startsWith(partial))
      .map(k => `/agent info ${k}`);
  }
  if (trimmed.startsWith('agent route ')) {
    const partial = trimmed.replace('agent route ', '');
    return listCategories()
      .filter(k => k.toLowerCase().startsWith(partial))
      .slice(0, 5)
      .map(k => `/agent route ${k}`);
  }
  if (trimmed.startsWith('mcp install ')) {
    const partial = trimmed.replace('mcp install ', '');
    return listMcpKeys()
      .filter(k => k.toLowerCase().startsWith(partial))
      .map(k => `/mcp install ${k}`);
  }

  return matches.slice(0, 5).map(c => `/${c}`);
}

// ─── Command Execution ──────────────────────────────────────────────
export async function executeCommand(input: string): Promise<string[]> {
  const parts = input.trim().replace(/^\//, '').split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      return helpCommand();
    case 'test':
      return await testCommand();
    case 'profile':
      return await profileCommand(args);
    case 'agent':
      return agentCommand(args);
    case 'categories':
      return categoriesCommand();
    case 'mcp':
      return await mcpCommand(args);
    case 'lsp':
      return lspCommand(args);
    case 'stats':
      return await statsCommand();
    case 'version':
      return [goldBold(`OMO Suites v${VERSION}`)];
    case 'clear':
      return [];
    case 'quit':
    case 'q':
      process.exit(0);
    default:
      return [red(`Unknown command: /${cmd}`), dim(`Type /help for available commands`)];
  }
}

// ─── /help ───────────────────────────────────────────────────────────
function helpCommand(): string[] {
  return [
    goldBold('═══ Available Commands ═══'),
    '',
    `  ${gold('/help')}                  List all commands`,
    `  ${gold('/test')}                  Run health check`,
    `  ${gold('/profile')}               Show active profile`,
    `  ${gold('/profile list')}          List all profiles`,
    `  ${gold('/profile use <name>')}    Switch profile`,
    `  ${gold('/agent list')}            List all agents`,
    `  ${gold('/agent info <name>')}     Agent details`,
    `  ${gold('/agent route <cat>')}     Find agent for category`,
    `  ${gold('/categories')}            List task categories`,
    `  ${gold('/mcp list')}              List MCP servers`,
    `  ${gold('/mcp install <name>')}    Install MCP server`,
    `  ${gold('/lsp detect')}            Detect project LSPs`,
    `  ${gold('/stats')}                 Token usage`,
    `  ${gold('/version')}               Version info`,
    `  ${gold('/clear')}                 Clear output`,
    `  ${gold('/quit')}                  Exit`,
    '',
    dim('  Press Escape to dismiss results'),
  ];
}

// ─── /test ───────────────────────────────────────────────────────────
async function testCommand(): Promise<string[]> {
  const lines: string[] = [goldBold('═══ Health Check ═══'), ''];

  // OpenCode
  const opencode = await detectOpenCode();
  lines.push(
    `  ${opencode.installed ? green('✅') : red('❌')} ${bold('OpenCode:')} ${opencode.installed ? green(`Installed${opencode.version ? ` (${opencode.version})` : ''}`) : red('Not installed')}`
  );

  // Bun
  const bunOk = await commandExists('bun');
  const bunVer = bunOk ? await getCommandVersion('bun') : null;
  lines.push(
    `  ${bunOk ? green('✅') : red('❌')} ${bold('Bun:')} ${bunOk ? green(`Installed${bunVer ? ` (${bunVer})` : ''}`) : red('Not installed')}`
  );

  // Node
  const nodeOk = await commandExists('node');
  const nodeVer = nodeOk ? await getCommandVersion('node') : null;
  lines.push(
    `  ${nodeOk ? green('✅') : yellow('⚠️')} ${bold('Node.js:')} ${nodeOk ? green(`Installed${nodeVer ? ` (${nodeVer})` : ''}`) : yellow('Not installed')}`
  );

  // Git
  const gitOk = await commandExists('git');
  const gitVer = gitOk ? await getCommandVersion('git') : null;
  lines.push(
    `  ${gitOk ? green('✅') : yellow('⚠️')} ${bold('Git:')} ${gitOk ? green(`Installed${gitVer ? ` (${gitVer})` : ''}`) : yellow('Not installed')}`
  );

  // Config
  const hasConfig = await configExists();
  lines.push(
    `  ${hasConfig ? green('✅') : yellow('⚠️')} ${bold('OMOCS Config:')} ${hasConfig ? green('Found') : yellow('Not found — run omocs init')}`
  );

  // API Keys
  const envKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GITHUB_TOKEN'];
  const foundKeys = envKeys.filter(k => process.env[k]);
  lines.push(
    `  ${foundKeys.length > 0 ? green('✅') : yellow('⚠️')} ${bold('API Keys:')} ${foundKeys.length > 0 ? green(`${foundKeys.length} key(s) in env`) : yellow('No API keys found')}`
  );

  lines.push('');
  const passed = lines.filter(l => l.includes('✅')).length;
  const failed = lines.filter(l => l.includes('❌')).length;
  const warned = lines.filter(l => l.includes('⚠️')).length;
  lines.push(gold('─'.repeat(40)));
  lines.push(`  ${green(`${passed} passed`)}  ${red(`${failed} failed`)}  ${yellow(`${warned} warnings`)}`);

  return lines;
}

// ─── /profile ────────────────────────────────────────────────────────
async function profileCommand(args: string[]): Promise<string[]> {
  if (args.length === 0) {
    const config = await readConfig();
    const active = config.activeProfile;
    const profile = profilesList.find(p => p.name === active);
    if (!profile) return [dim(`Active profile: ${active} (unknown)`)];
    return [
      goldBold(`═══ Active Profile ═══`),
      '',
      `  ${bold('Name:')}  ${goldBold(profile.name)}`,
      `  ${bold('Scope:')} ${profile.scope}`,
      `  ${bold('Desc:')}  ${dim(profile.description)}`,
      '',
      `  ${bold('Primary:')}   ${modelColor(profile.models.primary)}`,
      ...(profile.models.secondary ? [`  ${bold('Secondary:')} ${modelColor(profile.models.secondary)}`] : []),
      ...(profile.models.review ? [`  ${bold('Review:')}    ${modelColor(profile.models.review)}`] : []),
      ...(profile.models.frontend ? [`  ${bold('Frontend:')}  ${modelColor(profile.models.frontend)}`] : []),
      ...(profile.models.research ? [`  ${bold('Research:')}  ${modelColor(profile.models.research)}`] : []),
    ];
  }

  if (args[0] === 'list') {
    const config = await readConfig();
    const lines: string[] = [goldBold('═══ Profiles ═══'), ''];
    for (const p of profilesList) {
      const active = p.name === config.activeProfile ? green(' [active]') : '';
      lines.push(`  ${gold(p.name.padEnd(22))} [${p.scope}]${active}  ${dim(p.description)}`);
    }
    return lines;
  }

  if (args[0] === 'use' && args[1]) {
    const name = args[1];
    const profile = profilesList.find(p => p.name === name);
    if (!profile) return [red(`Profile not found: ${name}`), dim(`Run /profile list to see available profiles`)];
    await setActiveProfile(profile.name);
    return [
      green(`✅ Switched to profile: ${goldBold(profile.name)}`),
      `  ${bold('Scope:')} ${profile.scope}`,
      `  ${dim(profile.description)}`,
    ];
  }

  return [dim(`Usage: /profile [list|use <name>]`)];
}

// ─── /agent ──────────────────────────────────────────────────────────
function agentCommand(args: string[]): string[] {
  if (args.length === 0 || args[0] === 'list') {
    const ids = listAgentIds();
    const lines: string[] = [goldBold('═══ Agents ═══'), ''];
    lines.push(goldBold(`  ${'Name'.padEnd(24)} ${'Model'.padEnd(28)} Budget`));
    lines.push(gold('  ' + '─'.repeat(65)));
    for (const id of ids) {
      const a = agents[id];
      const name = `${a.emoji} ${a.name}`;
      const model = shortModel(a.preferredModel);
      const budget = a.thinkingBudget >= 1024 ? `${Math.round(a.thinkingBudget / 1024)}K` : `${a.thinkingBudget}`;
      lines.push(`  ${white(name.padEnd(24))} ${dim(model.padEnd(28))} ${dim(budget + ' tokens')}`);
    }
    return lines;
  }

  if (args[0] === 'info' && args[1]) {
    const search = args[1].toLowerCase();
    const id = listAgentIds().find(id =>
      id.toLowerCase() === search ||
      agents[id].name.toLowerCase() === search
    );
    if (!id) return [red(`Agent not found: ${args[1]}`), dim('Run /agent list')];
    const a = agents[id];
    return [
      goldBold(`═══ ${a.emoji} ${a.name} ═══`),
      '',
      `  ${bold('ID:')}          ${dim(a.id)}`,
      `  ${bold('Model:')}       ${modelColor(a.preferredModel)}`,
      `  ${bold('Budget:')}      ${white(String(a.thinkingBudget))} tokens`,
      `  ${bold('Description:')} ${white(a.description)}`,
      '',
      `  ${bold('Tags:')}        ${a.tags.map(t => cyan(`#${t}`)).join('  ')}`,
      `  ${bold('Tools:')}       ${a.tools.map(t => dim(t)).join(', ')}`,
      `  ${bold('Prompt:')}      ${dim(a.systemPromptFile)}`,
    ];
  }

  if (args[0] === 'route' && args[1]) {
    const category = args[1].toLowerCase();
    const agent = getAgentForCategory(category);
    if (!agent) return [red(`No agent found for category: ${category}`), dim('Run /categories for available categories')];
    return [
      goldBold(`═══ Route ═══`),
      '',
      `  ${bold('Category:')} ${gold(category)}`,
      `  ${bold('Agent:')}    ${gold(agent.emoji + ' ' + agent.name)}`,
      `  ${bold('Model:')}    ${modelColor(agent.preferredModel)}`,
    ];
  }

  return [dim(`Usage: /agent [list|info <name>|route <category>]`)];
}

// ─── /categories ─────────────────────────────────────────────────────
function categoriesCommand(): string[] {
  const lines: string[] = [goldBold('═══ Task Categories ═══'), ''];
  const entries = Object.entries(categoryRouting);
  for (const [cat, agentId] of entries) {
    const agent = agents[agentId];
    const name = agent ? `${agent.emoji} ${agent.name}` : agentId;
    lines.push(`  ${gold(cat.padEnd(25))} → ${dim(name)}`);
  }
  return lines;
}

// ─── /mcp ────────────────────────────────────────────────────────────
async function mcpCommand(args: string[]): Promise<string[]> {
  if (args.length === 0 || args[0] === 'list') {
    const keys = listMcpKeys();
    const lines: string[] = [goldBold('═══ MCP Servers ═══'), ''];
    lines.push(goldBold(`  ${'Name'.padEnd(18)} Description`));
    lines.push(gold('  ' + '─'.repeat(55)));
    for (const key of keys) {
      const s = mcpServers[key];
      lines.push(`  ${white(s.name.padEnd(18))} ${dim(s.description)}`);
    }
    return lines;
  }

  if (args[0] === 'install' && args[1]) {
    const key = args[1].toLowerCase();
    const server = mcpServers[key];
    if (!server) return [red(`MCP server not found: ${args[1]}`), dim('Run /mcp list')];
    try {
      await addMcpToConfig(key, server.command, server.args, server.env);
      return [green(`✅ Added ${goldBold(server.name)} to .opencode.json`), dim(`Command: ${server.command} ${server.args.join(' ')}`)];
    } catch (err) {
      return [red(`❌ Failed to install: ${err}`)];
    }
  }

  return [dim(`Usage: /mcp [list|install <name>]`)];
}

// ─── /lsp ────────────────────────────────────────────────────────────
function lspCommand(args: string[]): string[] {
  if (args.length === 0 || args[0] === 'detect' || args[0] === 'list') {
    const keys = listLspKeys();
    const lines: string[] = [goldBold('═══ LSP Servers ═══'), ''];
    lines.push(goldBold(`  ${'Name'.padEnd(16)} ${'Install Command'}`));
    lines.push(gold('  ' + '─'.repeat(60)));
    for (const key of keys) {
      const s = lspServers[key];
      lines.push(`  ${white(s.name.padEnd(16))} ${dim(s.install)}`);
    }
    lines.push('');
    lines.push(dim('  Detects: based on project files'));
    return lines;
  }

  return [dim(`Usage: /lsp [detect|list]`)];
}

// ─── /stats ──────────────────────────────────────────────────────────
async function statsCommand(): Promise<string[]> {
  const { existsSync } = await import('fs');
  const { join } = await import('path');
  const { homedir } = await import('os');

  const statsPath = join(homedir(), '.omocs', 'stats.json');
  if (!existsSync(statsPath)) {
    return [
      goldBold('═══ Stats ═══'),
      '',
      dim('  📊 No usage data yet.'),
      '',
      dim('  Stats are collected when you use omocs'),
      dim('  with OpenCode. Start a coding session'),
      dim('  and check back later!'),
    ];
  }

  try {
    const file = Bun.file(statsPath);
    const text = await file.text();
    const data = JSON.parse(text);
    const lines: string[] = [goldBold('═══ Stats ═══'), ''];
    lines.push(`  ${bold('Total Tokens:')} ${white(formatNumber(data.totalTokens || 0))}`);
    lines.push(`  ${bold('Total Cost:')}   ${green('$' + (data.totalCost || 0).toFixed(4))}`);
    lines.push(`  ${bold('Sessions:')}     ${white(String(data.sessions || 0))}`);
    return lines;
  } catch {
    return [dim('  Failed to read stats file')];
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
