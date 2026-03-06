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
import {
  initialLaunchboardState, loadLaunchboardStatus, renderLaunchboardView, type LaunchboardViewState,
} from './views/launchboard.ts';
import { addMcpToConfig, removeMcpFromConfig } from '../core/opencode.ts';
import { mcpServers, listMcpKeys } from '../data/mcp-registry.ts';
import { executeCommand, getAutocompleteSuggestions } from './commands.ts';

// ─── State ───────────────────────────────────────────────────────────
interface TUIState {
  activePane: 'menu' | 'content';
  menuIndex: number;
  searchMode: boolean;
  searchQuery: string;
  helpVisible: boolean;
  statusMessage: string;
  statusTimeout: ReturnType<typeof setTimeout> | null;

  // Command bar state
  commandMode: boolean;
  commandInput: string;
  commandResult: string[];
  showResult: boolean;
  resultScrollOffset: number;

  // View states
  profile: ProfileViewState;
  agents: AgentsViewState;
  mcp: McpViewState;
  lsp: LspViewState;
  doctor: DoctorViewState;
  stats: StatsViewState;
  launchboard: LaunchboardViewState;
}

let state: TUIState = {
  activePane: 'menu',
  menuIndex: 0,
  searchMode: false,
  searchQuery: '',
  helpVisible: false,
  statusMessage: '',
  statusTimeout: null,

  // Command bar
  commandMode: false,
  commandInput: '',
  commandResult: [],
  showResult: false,
  resultScrollOffset: 0,

  profile: initialProfileState(),
  agents: initialAgentsState(),
  mcp: initialMcpState(),
  lsp: initialLspState(),
  doctor: initialDoctorState(),
  stats: initialStatsState(),
  launchboard: initialLaunchboardState(),
};

// ─── Rendering ───────────────────────────────────────────────────────
async function render(): Promise<void> {
  const view = await getCurrentView();

  // Get autocomplete suggestions when in command mode
  const suggestions = state.commandMode
    ? getAutocompleteSuggestions(state.commandInput)
    : [];

  // If showing result overlay, override content title
  const contentTitle = state.showResult && state.commandResult.length > 0
    ? `Output: /${state.commandInput || 'command'}`
    : view.title;

  const ctx: RenderContext = {
    activePane: state.activePane,
    menuIndex: state.menuIndex,
    contentLines: view.lines,
    contentTitle: contentTitle,
    footerHint: state.statusMessage || view.hint,
    searchMode: state.searchMode,
    searchQuery: state.searchQuery,
    helpVisible: state.helpVisible,
    // Command bar
    commandMode: state.commandMode,
    commandInput: state.commandInput,
    commandResult: state.commandResult,
    showResult: state.showResult,
    resultScrollOffset: state.resultScrollOffset,
    autocompleteSuggestions: suggestions,
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

    case 6: // Launchboard
      if (!state.launchboard.loaded) {
        await loadLaunchboardStatus(state.launchboard);
      }
      return renderLaunchboardView(state.launchboard);

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
  // Command mode: cancel
  if (state.commandMode) {
    state.commandMode = false;
    state.commandInput = '';
    return;
  }

  // Result overlay: dismiss
  if (state.showResult) {
    state.showResult = false;
    state.commandResult = [];
    state.resultScrollOffset = 0;
    return;
  }

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

// ─── Command Mode Handlers ───────────────────────────────────────────
function enterCommandMode(): void {
  state.commandMode = true;
  state.commandInput = '';
  state.showResult = false;
  state.resultScrollOffset = 0;
}

async function handleCommandInput(str: string): Promise<void> {
  if (str === '\x1b') {
    // Escape
    handleEscape();
    return;
  }
  if (str === '\r') {
    // Enter — execute command
    if (state.commandInput.trim()) {
      const lastInput = state.commandInput;
      const result = await executeCommand(state.commandInput);
      state.commandMode = false;
      if (result.length === 0) {
        // /clear command — dismiss overlay
        state.showResult = false;
        state.commandResult = [];
        state.resultScrollOffset = 0;
      } else {
        state.commandResult = result;
        state.showResult = true;
        state.resultScrollOffset = 0;
        state.commandInput = lastInput; // preserve for title display
      }
    } else {
      state.commandMode = false;
    }
    return;
  }
  if (str === '\x7f' || str === '\b') {
    // Backspace
    state.commandInput = state.commandInput.slice(0, -1);
    return;
  }
  if (str === '\t') {
    // Tab — autocomplete
    const suggestions = getAutocompleteSuggestions(state.commandInput);
    if (suggestions.length > 0) {
      // Apply first suggestion, remove leading /
      state.commandInput = suggestions[0].replace(/^\//, '');
    }
    return;
  }
  // Ignore arrow keys and other escape sequences in command mode
  if (str.startsWith('\x1b[')) {
    return;
  }
  // Regular character
  if (str.length === 1 && str >= ' ') {
    state.commandInput += str;
  }
}

// ─── Input Handler ───────────────────────────────────────────────────
async function handleInput(data: Buffer): Promise<void> {
  const str = data.toString();

  // Command mode — intercept all input
  if (state.commandMode) {
    await handleCommandInput(str);
    await render();
    return;
  }

  // Result overlay — handle scroll and dismiss
  if (state.showResult) {
    switch (str) {
      case '\x1b': // Escape — dismiss
        handleEscape();
        await render();
        return;
      case '\x1b[A': // Up — scroll up
      case 'k':
        state.resultScrollOffset = Math.max(0, state.resultScrollOffset - 1);
        await render();
        return;
      case '\x1b[B': // Down — scroll down
      case 'j':
        state.resultScrollOffset = Math.min(
          Math.max(0, state.commandResult.length - 5),
          state.resultScrollOffset + 1
        );
        await render();
        return;
      case 'q':
      case '\x03':
        cleanup();
        process.exit(0);
        break;
      case '/': // Enter command mode from result overlay
        state.showResult = false;
        state.commandResult = [];
        state.resultScrollOffset = 0;
        enterCommandMode();
        await render();
        return;
    }
    await render();
    return;
  }

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
      // Enter command mode (not search mode)
      enterCommandMode();
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
      } else if (state.menuIndex === 6) {
        state.launchboard.loaded = false;
        await loadLaunchboardStatus(state.launchboard);
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
