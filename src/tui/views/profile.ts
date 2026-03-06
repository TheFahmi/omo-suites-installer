import { profilesList, type Profile } from '../../data/profiles.ts';
import { readConfig, setActiveProfile } from '../../core/config.ts';
import { gold, goldBold, dim, bold, white, green, cyan, yellow, gray, modelColor, shortModel } from '../utils.ts';

export interface ProfileViewState {
  selectedIndex: number;
  subView: 'overview' | 'list';
}

export function initialProfileState(): ProfileViewState {
  return { selectedIndex: 0, subView: 'overview' };
}

export async function renderProfileOverview(state: ProfileViewState): Promise<{ lines: string[]; title: string; hint: string }> {
  const config = await readConfig();
  const activeKey = config.activeProfile;
  const profile = profilesList.find(p => p.name === activeKey);

  const lines: string[] = [];

  if (!profile) {
    lines.push(dim(`Active profile: ${activeKey} (unknown)`));
    lines.push('');
    lines.push(dim('Press Enter to browse profiles'));
    return { lines, title: 'Profile', hint: dim('[Enter] browse profiles') };
  }

  lines.push(`${bold('Active Profile:')} ${goldBold(profile.name)}`);
  lines.push(`${bold('Scope:')} ${scopeColor(profile.scope)}`);
  lines.push(`${bold('Description:')} ${dim(profile.description)}`);
  lines.push('');
  lines.push(goldBold('Model Assignments:'));

  if (profile.models.primary) {
    lines.push(`  ${dim('Primary:')}    ${modelColor(profile.models.primary)}`);
  }
  if (profile.models.secondary) {
    lines.push(`  ${dim('Secondary:')}  ${modelColor(profile.models.secondary)}`);
  }
  if (profile.models.review) {
    lines.push(`  ${dim('Review:')}     ${modelColor(profile.models.review)}`);
  }
  if (profile.models.frontend) {
    lines.push(`  ${dim('Frontend:')}   ${modelColor(profile.models.frontend)}`);
  }
  if (profile.models.research) {
    lines.push(`  ${dim('Research:')}   ${modelColor(profile.models.research)}`);
  }

  lines.push('');
  lines.push(goldBold('Agent Routing (OpenCode):'));
  lines.push(`  ${dim('Coder:')} ${modelColor(profile.agents.coder)}`);
  lines.push(`  ${dim('Task:')}  ${modelColor(profile.agents.task)}`);
  lines.push(`  ${dim('Title:')} ${modelColor(profile.agents.title)}`);

  lines.push('');
  lines.push(dim(`[Enter] Browse all ${profilesList.length} profiles`));

  return { lines, title: 'Profile', hint: dim('[Enter] browse profiles') };
}

export async function renderProfileList(state: ProfileViewState): Promise<{ lines: string[]; title: string; hint: string }> {
  const config = await readConfig();
  const activeKey = config.activeProfile;

  const lines: string[] = [];

  for (let i = 0; i < profilesList.length; i++) {
    const p = profilesList[i];
    const isActive = p.name === activeKey;
    const isSelected = i === state.selectedIndex;
    const cursor = isSelected ? gold(' ▸ ') : '   ';
    const activeTag = isActive ? green(' [active]') : '';
    const scope = scopeBadge(p.scope);

    if (isSelected) {
      lines.push(`${cursor}${goldBold(p.name)}${activeTag} ${scope}`);
    } else {
      lines.push(`${cursor}${white(p.name)}${activeTag} ${scope}`);
    }
  }

  lines.push('');

  // Preview selected profile
  const selected = profilesList[state.selectedIndex];
  if (selected) {
    lines.push(gold('─'.repeat(40)));
    lines.push(`${goldBold('Preview:')} ${selected.name}`);
    lines.push(`${dim(selected.description)}`);
    lines.push('');
    if (selected.models.primary) lines.push(`  ${dim('Primary:')} ${modelColor(selected.models.primary)}`);
    if (selected.models.secondary) lines.push(`  ${dim('Secondary:')} ${modelColor(selected.models.secondary)}`);
    if (selected.models.review) lines.push(`  ${dim('Review:')} ${modelColor(selected.models.review)}`);
    if (selected.models.frontend) lines.push(`  ${dim('Frontend:')} ${modelColor(selected.models.frontend)}`);
    if (selected.models.research) lines.push(`  ${dim('Research:')} ${modelColor(selected.models.research)}`);
  }

  return {
    lines,
    title: `Select Profile (${state.selectedIndex + 1}/${profilesList.length})`,
    hint: dim('[Enter] apply  [Esc] back  [↑↓] navigate'),
  };
}

export async function applyProfile(state: ProfileViewState): Promise<string> {
  const profile = profilesList[state.selectedIndex];
  if (!profile) return 'No profile selected';
  await setActiveProfile(profile.name);
  return `Profile switched to ${profile.name}`;
}

export function profileListLength(): number {
  return profilesList.length;
}

function scopeColor(scope: string): string {
  switch (scope) {
    case 'all': return green(scope);
    case 'lead': return cyan(scope);
    case 'mixed': return gold(scope);
    case 'economy': return yellow(scope);
    default: return dim(scope);
  }
}

function scopeBadge(scope: string): string {
  switch (scope) {
    case 'all': return green(`[${scope}]`);
    case 'lead': return cyan(`[${scope}]`);
    case 'mixed': return gold(`[${scope}]`);
    case 'economy': return yellow(`[${scope}]`);
    default: return dim(`[${scope}]`);
  }
}
