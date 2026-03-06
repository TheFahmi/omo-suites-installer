import { gold, goldBold, dim, bold, white, green, red, cyan, gray } from '../utils.ts';

export interface LaunchboardViewState {
  loaded: boolean;
  apiRunning: boolean | null;
  frontendRunning: boolean | null;
  apiVersion: string;
  error: string;
}

export function initialLaunchboardState(): LaunchboardViewState {
  return {
    loaded: false,
    apiRunning: null,
    frontendRunning: null,
    apiVersion: '',
    error: '',
  };
}

export async function loadLaunchboardStatus(state: LaunchboardViewState): Promise<void> {
  state.loaded = true;

  // Check backend API
  try {
    const res = await fetch('http://localhost:3030/api/health', { signal: AbortSignal.timeout(2000) });
    const data = await res.json() as any;
    state.apiRunning = true;
    state.apiVersion = data.version || 'unknown';
  } catch {
    state.apiRunning = false;
  }

  // Check frontend
  try {
    await fetch('http://localhost:3040', { signal: AbortSignal.timeout(2000) });
    state.frontendRunning = true;
  } catch {
    state.frontendRunning = false;
  }
}

export function renderLaunchboardView(state: LaunchboardViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  lines.push(dim('Plan. Build. Launch.'));
  lines.push('');

  if (!state.loaded) {
    lines.push(dim('Loading status...'));
    return { lines, title: '🚀 Launchboard', hint: '[r] refresh' };
  }

  // Status section
  lines.push(goldBold('Status'));
  lines.push('');

  if (state.apiRunning) {
    lines.push(`  ${green('✅')} ${bold('Backend API')}  ${green('Running')}`);
    lines.push(`     ${dim('http://localhost:3030')}`);
    if (state.apiVersion) {
      lines.push(`     ${dim(`Version: ${state.apiVersion}`)}`);
    }
  } else {
    lines.push(`  ${red('❌')} ${bold('Backend API')}  ${red('Stopped')}`);
  }

  lines.push('');

  if (state.frontendRunning) {
    lines.push(`  ${green('✅')} ${bold('Frontend')}     ${green('Running')}`);
    lines.push(`     ${dim('http://localhost:3040')}`);
  } else {
    lines.push(`  ${red('❌')} ${bold('Frontend')}     ${red('Stopped')}`);
  }

  lines.push('');
  lines.push(goldBold('Quick Actions'));
  lines.push('');
  lines.push(`  ${gold('omocs launchboard setup')}   ${dim('First-time setup')}`);
  lines.push(`  ${gold('omocs launchboard start')}   ${dim('Start backend + frontend')}`);
  lines.push(`  ${gold('omocs lb status')}            ${dim('Check status')}`);

  lines.push('');
  lines.push(goldBold('Features'));
  lines.push('');
  lines.push(`  ${dim('•')} ${white('AI-integrated Kanban board')}`);
  lines.push(`  ${dim('•')} ${white('Workspace & task management')}`);
  lines.push(`  ${dim('•')} ${white('MCP server for AI agent integration')}`);
  lines.push(`  ${dim('•')} ${white('Drag-and-drop task workflow')}`);

  return { lines, title: '🚀 Launchboard', hint: '[r] refresh' };
}
