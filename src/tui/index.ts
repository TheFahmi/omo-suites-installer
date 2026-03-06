import { renderScreen, MENU_ITEMS, type RenderContext } from './renderer.ts';
import { showCursor, hideCursor } from './utils.ts';
import {
  initialProfileState, renderProfileOverview, renderProfileList,
  applyProfile, profileListLength, type ProfileViewState,
} from './views/profile.ts';
import {
  initialAgentsState, renderAgentsList, renderAgentDetail,
  filterAgents, agentsListLength, type AgentsViewState,
} from './views/agents.ts';
import {
  initialMcpState, loadMcpStatus, renderMcpList,
  filterMcp, mcpListLength, type McpViewState,
} from './views/mcp.ts';
import {
  initialLspState, loadLspStatus, renderLspList,
  filterLsp, lspListLength, type LspViewState,
} from './views/lsp.ts';
import {
  initialDoctorState, runDoctorChecks, renderDoctor, type DoctorViewState,
} from './views/doctor.ts';
import {
  initialStatsState, loadStats, renderStats, type StatsViewState,
} from './views/stats.ts';
import { addMcpToConfig, removeMcpFromConfig } from '../core/opencode.ts';
import { mcpServers, listMcpKeys } from '../data/mcp-registry.ts';

// ─── State ───────────────────────────────────────────────────────────
interface TUIState {
  activePane: 'menu' | 'content';
  menuIndex: number;
  searchMode: boolean;
  searchQuery: string;
  helpVisible: boolean;
  statusMessage: string;
  statusTimeout: ReturnType<typeof setTimeout> | null;

  // View states
  profile: ProfileViewState;
  agents: AgentsViewState;
  mcp: McpViewState;
  lsp: LspViewState;
  doctor: DoctorViewState;
  stats: StatsViewState;
}

let state: TUIState = {
  activePane: 'menu',
  menuIndex: 0,
  searchMode: false,
  searchQuery: '',
  helpVisible: false,
  statusMessage: '',
  statusTimeout: null,

  profile: initialProfileState(),
  agents: initialAgentsState(),
  mcp: initialMcpState(),
  lsp: initialLspState(),
  doctor: initialDoctorState(),
  stats: initialStatsState(),
};

// ─── Rendering ───────────────────────────────────────────────────────
async function render(): Promise<void> {
  const view = await getCurrentView();

  const ctx: RenderContext = {
    activePane: state.activePane,
    menuIndex: state.menuIndex,
    contentLines: view.lines,
    contentTitle: view.title,
    footerHint: state.statusMessage || view.hint,
    searchMode: state.searchMode,
    searchQuery: state.searchQuery,
    helpVisible: state.helpVisible,
  };

  renderScreen(ctx);
}

async function getCurrentView(): Promise<{ lines: string[]; title: string; hint: string }> {
  switch (state.menuIndex) {
    case 0: // Profile
      if (state.profile.subView === 'list') {
        return renderProfileList(state.profile);
      }
      return renderProfileOverview(state.profile);

    case 1: // Agents
      if (state.agents.subView === 'detail') {
        return renderAgentDetail(state.agents);
      }
      return renderAgentsList(state.agents);

    case 2: // MCP
      if (!state.mcp.loaded) {
        await loadMcpStatus(state.mcp);
      }
      return renderMcpList(state.mcp);

    case 3: // LSP
      if (!state.lsp.loaded) {
        await loadLspStatus(state.lsp);
      }
      return renderLspList(state.lsp);

    case 4: // Doctor
      if (!state.doctor.done && !state.doctor.running) {
        // Auto-run on entry
        runDoctorChecks(state.doctor, () => render());
      }
      return renderDoctor(state.doctor);

    case 5: // Stats
      if (!state.stats.loaded) {
        await loadStats(state.stats);
      }
      return renderStats(state.stats);

    default:
      return { lines: ['Unknown view'], title: '', hint: '' };
  }
}

// ─── Status Messages ─────────────────────────────────────────────────
function showStatus(msg: string, durationMs = 2000): void {
  state.statusMessage = msg;
  if (state.statusTimeout) clearTimeout(state.statusTimeout);
  state.statusTimeout = setTimeout(() => {
    state.statusMessage = '';
    render();
  }, durationMs);
}

// ─── Content Navigation Length ───────────────────────────────────────
function getContentLength(): number {
  switch (state.menuIndex) {
    case 0: return state.profile.subView === 'list' ? profileListLength() : 0;
    case 1: return state.agents.subView === 'list' ? agentsListLength(state.agents) : 0;
    case 2: return mcpListLength(state.mcp);
    case 3: return lspListLength(state.lsp);
    default: return 0;
  }
}

// ─── Actions ─────────────────────────────────────────────────────────
function moveUp(): void {
  if (state.activePane === 'menu') {
    state.menuIndex = Math.max(0, state.menuIndex - 1);
  } else {
    // Content navigation
    switch (state.menuIndex) {
      case 0:
        if (state.profile.subView === 'list') {
          state.profile.selectedIndex = Math.max(0, state.profile.selectedIndex - 1);
        }
        break;
      case 1:
        state.agents.selectedIndex = Math.max(0, state.agents.selectedIndex - 1);
        break;
      case 2:
        state.mcp.selectedIndex = Math.max(0, state.mcp.selectedIndex - 1);
        break;
      case 3:
        state.lsp.selectedIndex = Math.max(0, state.lsp.selectedIndex - 1);
        break;
    }
  }
}

function moveDown(): void {
  if (state.activePane === 'menu') {
    state.menuIndex = Math.min(MENU_ITEMS.length - 1, state.menuIndex + 1);
  } else {
    switch (state.menuIndex) {
      case 0:
        if (state.profile.subView === 'list') {
          state.profile.selectedIndex = Math.min(profileListLength() - 1, state.profile.selectedIndex + 1);
        }
        break;
      case 1:
        state.agents.selectedIndex = Math.min(agentsListLength(state.agents) - 1, state.agents.selectedIndex + 1);
        break;
      case 2:
        state.mcp.selectedIndex = Math.min(mcpListLength(state.mcp) - 1, state.mcp.selectedIndex + 1);
        break;
      case 3:
        state.lsp.selectedIndex = Math.min(lspListLength(state.lsp) - 1, state.lsp.selectedIndex + 1);
        break;
    }
  }
}

async function handleEnter(): Promise<void> {
  if (state.activePane === 'menu') {
    // Switch to content pane
    state.activePane = 'content';
    return;
  }

  // Content actions
  switch (state.menuIndex) {
    case 0: // Profile
      if (state.profile.subView === 'overview') {
        state.profile.subView = 'list';
      } else {
        const msg = await applyProfile(state.profile);
        state.profile.subView = 'overview';
        showStatus(`✅ ${msg}`);
      }
      break;

    case 1: // Agents
      if (state.agents.subView === 'list') {
        state.agents.subView = 'detail';
      } else {
        state.agents.subView = 'list';
      }
      break;

    case 2: // MCP - toggle install
      await toggleMcp();
      break;

    case 3: // LSP
      // Show install command
      {
        const { lspServers } = await import('../data/lsp-registry.ts');
        const key = state.lsp.filteredKeys[state.lsp.selectedIndex];
        const lsp = lspServers[key];
        if (lsp) {
          showStatus(`Install: ${lsp.install}`, 5000);
        }
      }
      break;

    case 4: // Doctor - re-run
      state.doctor = initialDoctorState();
      runDoctorChecks(state.doctor, () => render());
      break;
  }
}

async function toggleMcp(): Promise<void> {
  const key = state.mcp.filteredKeys[state.mcp.selectedIndex];
  if (!key) return;

  const server = mcpServers[key];
  if (state.mcp.installedKeys.has(key)) {
    // Remove
    await removeMcpFromConfig(key);
    state.mcp.installedKeys.delete(key);
    state.mcp.message = `❌ Removed ${server.name}`;
    showStatus(`Removed ${server.name} from config`);
  } else {
    // Add
    await addMcpToConfig(key, server.command, server.args, server.env);
    state.mcp.installedKeys.add(key);
    state.mcp.message = `✅ Added ${server.name}`;
    showStatus(`Added ${server.name} to config`);
  }
}

function handleEscape(): void {
  if (state.searchMode) {
    state.searchMode = false;
    state.searchQuery = '';
    // Clear search in current view
    if (state.menuIndex === 1) { state.agents.searchQuery = ''; filterAgents(state.agents); }
    if (state.menuIndex === 2) { state.mcp.searchQuery = ''; filterMcp(state.mcp); }
    if (state.menuIndex === 3) { state.lsp.searchQuery = ''; filterLsp(state.lsp); }
    return;
  }

  if (state.helpVisible) {
    state.helpVisible = false;
    return;
  }

  // Back navigation
  switch (state.menuIndex) {
    case 0:
      if (state.profile.subView === 'list') {
        state.profile.subView = 'overview';
        return;
      }
      break;
    case 1:
      if (state.agents.subView === 'detail') {
        state.agents.subView = 'list';
        return;
      }
      break;
  }

  // Switch to menu pane
  state.activePane = 'menu';
}

function switchPane(): void {
  state.activePane = state.activePane === 'menu' ? 'content' : 'menu';
}

function startSearch(): void {
  // Only in views that support search
  if ([1, 2, 3].includes(state.menuIndex)) {
    state.searchMode = true;
    state.searchQuery = '';
    state.activePane = 'content';
  }
}

function handleSearchInput(char: string): void {
  if (char === '\x7f' || char === '\b') {
    // Backspace
    state.searchQuery = state.searchQuery.slice(0, -1);
  } else if (char === '\r') {
    // Enter - apply search
    state.searchMode = false;
  } else if (char.length === 1 && char >= ' ') {
    state.searchQuery += char;
  }

  // Apply search to current view
  if (state.menuIndex === 1) { state.agents.searchQuery = state.searchQuery; filterAgents(state.agents); }
  if (state.menuIndex === 2) { state.mcp.searchQuery = state.searchQuery; filterMcp(state.mcp); }
  if (state.menuIndex === 3) { state.lsp.searchQuery = state.searchQuery; filterLsp(state.lsp); }
}

// ─── Input Handler ───────────────────────────────────────────────────
async function handleInput(data: Buffer): Promise<void> {
  const str = data.toString();

  // Search mode — intercept all input
  if (state.searchMode) {
    if (str === '\x1b' || str === '\x1b[A' || str === '\x1b[B') {
      // Escape or arrows exit search
      handleEscape();
    } else {
      handleSearchInput(str);
    }
    await render();
    return;
  }

  // Normal key handling
  switch (str) {
    case 'q':
    case '\x03': // Ctrl+C
      cleanup();
      process.exit(0);
      break;

    case '\x1b[A': // Arrow up
    case 'k':
      moveUp();
      break;

    case '\x1b[B': // Arrow down
    case 'j':
      moveDown();
      break;

    case '\r': // Enter
      await handleEnter();
      break;

    case '\t': // Tab
      switchPane();
      break;

    case '\x1b': // Escape
      handleEscape();
      break;

    case '/':
      startSearch();
      break;

    case 'h':
      state.helpVisible = !state.helpVisible;
      break;

    case 'r':
      // Refresh current view
      if (state.menuIndex === 3) {
        state.lsp.loaded = false;
        await loadLspStatus(state.lsp);
      } else if (state.menuIndex === 4) {
        state.doctor = initialDoctorState();
        runDoctorChecks(state.doctor, () => render());
      } else if (state.menuIndex === 5) {
        state.stats.loaded = false;
        await loadStats(state.stats);
      } else if (state.menuIndex === 2) {
        state.mcp.loaded = false;
        await loadMcpStatus(state.mcp);
      }
      break;
  }

  await render();
}

// ─── Cleanup ─────────────────────────────────────────────────────────
function cleanup(): void {
  showCursor();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdout.write('\x1b[2J\x1b[H');
}

// ─── Start TUI ──────────────────────────────────────────────────────
export async function startTUI(): Promise<void> {
  // Check if TTY
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Use `omocs --help` for CLI mode.');
    process.exit(1);
  }

  // Setup terminal
  hideCursor();
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Handle cleanup on exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  // Handle resize
  process.stdout.on('resize', () => render());

  // Listen for input
  process.stdin.on('data', (data: any) => {
    handleInput(Buffer.from(data)).catch(err => {
      cleanup();
      console.error('TUI Error:', err);
      process.exit(1);
    });
  });

  // Initial render
  await render();
}
