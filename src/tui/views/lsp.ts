import { lspServers, type LspServer, listLspKeys } from '../../data/lsp-registry.ts';
import { commandExists } from '../../utils/shell.ts';
import { gold, goldBold, dim, bold, white, green, red, cyan, gray } from '../utils.ts';

export interface LspViewState {
  selectedIndex: number;
  installedKeys: Set<string>;
  loaded: boolean;
  searchQuery: string;
  filteredKeys: string[];
  checking: boolean;
}

const allKeys = listLspKeys();

export function initialLspState(): LspViewState {
  return {
    selectedIndex: 0,
    installedKeys: new Set(),
    loaded: false,
    searchQuery: '',
    filteredKeys: [...allKeys],
    checking: false,
  };
}

export async function loadLspStatus(state: LspViewState): Promise<void> {
  state.checking = true;
  state.installedKeys.clear();

  for (const key of allKeys) {
    const lsp = lspServers[key];
    const exists = await commandExists(lsp.command);
    if (exists) {
      state.installedKeys.add(key);
    }
  }

  state.loaded = true;
  state.checking = false;
}

export function filterLsp(state: LspViewState): void {
  if (!state.searchQuery) {
    state.filteredKeys = [...allKeys];
  } else {
    const q = state.searchQuery.toLowerCase();
    state.filteredKeys = allKeys.filter(key => {
      const s = lspServers[key];
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }
  if (state.selectedIndex >= state.filteredKeys.length) {
    state.selectedIndex = Math.max(0, state.filteredKeys.length - 1);
  }
}

export function renderLspList(state: LspViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  if (state.checking) {
    lines.push(gold('⟳ Detecting installed LSP servers...'));
    lines.push('');
  }

  if (state.searchQuery) {
    lines.push(dim(`Search: "${state.searchQuery}" (${state.filteredKeys.length} results)`));
    lines.push('');
  }

  const installed = state.installedKeys.size;
  const total = allKeys.length;
  lines.push(dim(`${installed}/${total} LSP servers detected in PATH`));
  lines.push('');

  // Header
  lines.push(goldBold(` ${'Status'.padEnd(8)} ${'Name'.padEnd(16)} Description`));
  lines.push(gold('─'.repeat(60)));

  for (let i = 0; i < state.filteredKeys.length; i++) {
    const key = state.filteredKeys[i];
    const s = lspServers[key];
    const isInstalled = state.installedKeys.has(key);
    const isSelected = i === state.selectedIndex;
    const cursor = isSelected ? gold('▸') : ' ';
    const status = isInstalled ? green('  ✅  ') : red('  ❌  ');

    const desc = s.description.length > 32 ? s.description.slice(0, 30) + '…' : s.description;

    if (isSelected) {
      lines.push(`${cursor} ${status} ${goldBold(s.name.padEnd(16))} ${white(desc)}`);
    } else {
      lines.push(`${cursor} ${status} ${white(s.name.padEnd(16))} ${dim(desc)}`);
    }
  }

  // Show details for selected
  if (state.filteredKeys.length > 0) {
    const key = state.filteredKeys[state.selectedIndex];
    const s = lspServers[key];
    lines.push('');
    lines.push(gold('─'.repeat(60)));
    lines.push(`${bold('Command:')} ${dim(s.command + ' ' + s.args.join(' '))}`);
    lines.push(`${bold('Install:')} ${dim(s.install)}`);
    lines.push(`${bold('Detects:')} ${s.detect.map(d => cyan(d)).join(', ')}`);
  }

  return {
    lines,
    title: `LSP Servers (${state.filteredKeys.length})`,
    hint: dim('[Enter] install  [/] search  [r] refresh'),
  };
}

export function lspListLength(state: LspViewState): number {
  return state.filteredKeys.length;
}
