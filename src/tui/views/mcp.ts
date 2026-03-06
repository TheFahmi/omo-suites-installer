import { mcpServers, type McpServer, listMcpKeys } from '../../data/mcp-registry.ts';
import { readOpenCodeConfig } from '../../core/opencode.ts';
import { gold, goldBold, dim, bold, white, green, red, cyan, gray } from '../utils.ts';

export interface McpViewState {
  selectedIndex: number;
  installedKeys: Set<string>;
  loaded: boolean;
  searchQuery: string;
  filteredKeys: string[];
  message: string;
}

const allKeys = listMcpKeys();

export function initialMcpState(): McpViewState {
  return {
    selectedIndex: 0,
    installedKeys: new Set(),
    loaded: false,
    searchQuery: '',
    filteredKeys: [...allKeys],
    message: '',
  };
}

export async function loadMcpStatus(state: McpViewState): Promise<void> {
  const ocConfig = await readOpenCodeConfig();
  state.installedKeys.clear();
  if (ocConfig?.config?.mcpServers) {
    for (const key of Object.keys(ocConfig.config.mcpServers)) {
      if (allKeys.includes(key)) {
        state.installedKeys.add(key);
      }
    }
  }
  state.loaded = true;
}

export function filterMcp(state: McpViewState): void {
  if (!state.searchQuery) {
    state.filteredKeys = [...allKeys];
  } else {
    const q = state.searchQuery.toLowerCase();
    state.filteredKeys = allKeys.filter(key => {
      const s = mcpServers[key];
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q))
      );
    });
  }
  if (state.selectedIndex >= state.filteredKeys.length) {
    state.selectedIndex = Math.max(0, state.filteredKeys.length - 1);
  }
}

export function renderMcpList(state: McpViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  if (state.message) {
    lines.push(green(state.message));
    lines.push('');
  }

  if (state.searchQuery) {
    lines.push(dim(`Search: "${state.searchQuery}" (${state.filteredKeys.length} results)`));
    lines.push('');
  }

  const installed = state.installedKeys.size;
  const total = allKeys.length;
  lines.push(dim(`${installed}/${total} servers configured in .opencode.json`));
  lines.push('');

  // Header
  lines.push(goldBold(` ${'Status'.padEnd(8)} ${'Name'.padEnd(18)} Description`));
  lines.push(gold('─'.repeat(60)));

  for (let i = 0; i < state.filteredKeys.length; i++) {
    const key = state.filteredKeys[i];
    const s = mcpServers[key];
    const isInstalled = state.installedKeys.has(key);
    const isSelected = i === state.selectedIndex;
    const cursor = isSelected ? gold('▸') : ' ';
    const status = isInstalled ? green('  ✅  ') : red('  ❌  ');

    const desc = s.description.length > 30 ? s.description.slice(0, 28) + '…' : s.description;

    if (isSelected) {
      lines.push(`${cursor} ${status} ${goldBold(s.name.padEnd(18))} ${white(desc)}`);
    } else {
      lines.push(`${cursor} ${status} ${white(s.name.padEnd(18))} ${dim(desc)}`);
    }
  }

  // Show details for selected
  if (state.filteredKeys.length > 0) {
    const key = state.filteredKeys[state.selectedIndex];
    const s = mcpServers[key];
    lines.push('');
    lines.push(gold('─'.repeat(60)));
    lines.push(`${bold('Command:')} ${dim(s.command + ' ' + s.args.join(' '))}`);
    lines.push(`${bold('Tags:')}    ${s.tags.map(t => cyan(`#${t}`)).join(' ')}`);
    if (s.env && Object.keys(s.env).length > 0) {
      lines.push(`${bold('Env:')}     ${Object.keys(s.env).map(k => dim(k)).join(', ')}`);
    }
    if (s.install) {
      lines.push(`${bold('Install:')} ${dim(s.install)}`);
    }
  }

  return {
    lines,
    title: `MCP Servers (${state.filteredKeys.length})`,
    hint: dim('[Enter] toggle install  [/] search'),
  };
}

export function mcpListLength(state: McpViewState): number {
  return state.filteredKeys.length;
}
