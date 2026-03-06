import { agents, type AgentRole } from '../../data/agents.ts';
import { gold, goldBold, dim, bold, white, green, cyan, gray, modelColor, shortModel } from '../utils.ts';

export interface AgentsViewState {
  selectedIndex: number;
  subView: 'list' | 'detail';
  searchQuery: string;
  filteredIds: string[];
}

const agentIds = Object.keys(agents);

export function initialAgentsState(): AgentsViewState {
  return {
    selectedIndex: 0,
    subView: 'list',
    searchQuery: '',
    filteredIds: [...agentIds],
  };
}

export function filterAgents(state: AgentsViewState): void {
  if (!state.searchQuery) {
    state.filteredIds = [...agentIds];
  } else {
    const q = state.searchQuery.toLowerCase();
    state.filteredIds = agentIds.filter(id => {
      const a = agents[id];
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q))
      );
    });
  }
  if (state.selectedIndex >= state.filteredIds.length) {
    state.selectedIndex = Math.max(0, state.filteredIds.length - 1);
  }
}

export function renderAgentsList(state: AgentsViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  if (state.searchQuery) {
    lines.push(dim(`Search: "${state.searchQuery}" (${state.filteredIds.length} results)`));
    lines.push('');
  }

  // Header row
  lines.push(
    goldBold(` ${'Name'.padEnd(22)} ${'Model'.padEnd(24)} ${'Budget'.padEnd(8)} Tags`)
  );
  lines.push(gold('─'.repeat(70)));

  for (let i = 0; i < state.filteredIds.length; i++) {
    const id = state.filteredIds[i];
    const a = agents[id];
    const isSelected = i === state.selectedIndex;
    const cursor = isSelected ? gold('▸') : ' ';

    const name = `${a.emoji} ${a.name}`;
    const model = shortModel(a.preferredModel);
    const budget = formatBudget(a.thinkingBudget);
    const tags = a.tags.slice(0, 2).join(', ');

    if (isSelected) {
      lines.push(
        `${cursor} ${goldBold(name.padEnd(22))} ${modelColor(a.preferredModel).padEnd(24)} ${white(budget.padEnd(8))} ${dim(tags)}`
      );
    } else {
      lines.push(
        `${cursor} ${white(name.padEnd(22))} ${dim(model.padEnd(24))} ${dim(budget.padEnd(8))} ${dim(tags)}`
      );
    }
  }

  if (state.filteredIds.length === 0) {
    lines.push('');
    lines.push(dim('  No agents found matching your search.'));
  }

  return {
    lines,
    title: `Agents (${state.filteredIds.length})`,
    hint: dim('[Enter] details  [/] search  [Esc] clear'),
  };
}

export function renderAgentDetail(state: AgentsViewState): { lines: string[]; title: string; hint: string } {
  const id = state.filteredIds[state.selectedIndex];
  const a = agents[id];
  if (!a) {
    return { lines: [dim('No agent selected')], title: 'Agent Detail', hint: '' };
  }

  const lines: string[] = [];

  lines.push(`${a.emoji} ${goldBold(a.name)} ${dim(`(${a.id})`)}`);
  lines.push('');
  lines.push(`${bold('Description:')} ${white(a.description)}`);
  lines.push('');
  lines.push(`${bold('Model:')}     ${modelColor(a.preferredModel)}`);
  lines.push(`${bold('Budget:')}    ${white(formatBudget(a.thinkingBudget))} tokens`);
  lines.push('');
  lines.push(`${bold('Tags:')}`);
  lines.push(`  ${a.tags.map(t => cyan(`#${t}`)).join('  ')}`);
  lines.push('');
  lines.push(`${bold('Tools:')}`);
  lines.push(`  ${a.tools.map(t => dim(t)).join(', ')}`);
  lines.push('');
  lines.push(`${bold('System Prompt:')} ${dim(a.systemPromptFile)}`);

  return {
    lines,
    title: `Agent: ${a.name}`,
    hint: dim('[Esc] back to list'),
  };
}

export function agentsListLength(state: AgentsViewState): number {
  return state.filteredIds.length;
}

function formatBudget(tokens: number): string {
  if (tokens === 0) return '0';
  if (tokens >= 1024) return `${Math.round(tokens / 1024)}K`;
  return String(tokens);
}
