import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { commandExists, getCommandVersion } from '../utils/shell.ts';

// ─── Types ───────────────────────────────────────────────────────────
export interface OpenCodeConfig {
  provider?: string;
  model?: string;
  agents?: {
    coder?: string;
    task?: string;
    title?: string;
  };
  lsp?: Record<string, {
    command: string;
    args?: string[];
  }>;
  mcpServers?: Record<string, {
    type?: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  theme?: string;
  autoCompact?: boolean;
  [key: string]: unknown;
}

export interface ProfileConfig {
  agents: {
    coder: string;
    task: string;
    title: string;
  };
  settings: {
    autoCompact: boolean;
    [key: string]: unknown;
  };
}

// ─── Config Locations ────────────────────────────────────────────────
function getConfigPaths(): string[] {
  return [
    join(process.cwd(), '.opencode.json'),
    join(homedir(), '.opencode.json'),
    join(homedir(), '.config', 'opencode', 'config.json'),
  ];
}

// ─── Read OpenCode Config ────────────────────────────────────────────
export async function readOpenCodeConfig(): Promise<{ config: OpenCodeConfig; path: string } | null> {
  for (const configPath of getConfigPaths()) {
    if (existsSync(configPath)) {
      try {
        const file = Bun.file(configPath);
        const text = await file.text();
        return { config: JSON.parse(text), path: configPath };
      } catch {
        continue;
      }
    }
  }
  return null;
}

// ─── Write OpenCode Config ───────────────────────────────────────────
export async function writeOpenCodeConfig(config: OpenCodeConfig, path?: string): Promise<string> {
  const targetPath = path || join(process.cwd(), '.opencode.json');
  await Bun.write(targetPath, JSON.stringify(config, null, 2));
  return targetPath;
}

// ─── Merge Profile into OpenCode Config ──────────────────────────────
export async function mergeProfile(profile: ProfileConfig): Promise<{ config: OpenCodeConfig; path: string }> {
  const existing = await readOpenCodeConfig();
  const config: OpenCodeConfig = existing?.config || {};

  // Merge agent settings
  config.agents = {
    ...config.agents,
    ...profile.agents,
  };

  // Merge other settings
  if (profile.settings.autoCompact !== undefined) {
    config.autoCompact = profile.settings.autoCompact;
  }

  const configPath = existing?.path || join(process.cwd(), '.opencode.json');
  await Bun.write(configPath, JSON.stringify(config, null, 2));

  return { config, path: configPath };
}

// ─── Detect OpenCode ─────────────────────────────────────────────────
export async function detectOpenCode(): Promise<{ installed: boolean; version: string | null; configPath: string | null }> {
  const installed = await commandExists('opencode');
  let version: string | null = null;

  if (installed) {
    version = await getCommandVersion('opencode');
  }

  const configResult = await readOpenCodeConfig();

  return {
    installed,
    version,
    configPath: configResult?.path || null,
  };
}

// ─── Add LSP to Config ──────────────────────────────────────────────
export async function addLspToConfig(name: string, command: string, args: string[]): Promise<void> {
  const existing = await readOpenCodeConfig();
  const config: OpenCodeConfig = existing?.config || {};

  if (!config.lsp) config.lsp = {};
  config.lsp[name] = { command, args };

  await writeOpenCodeConfig(config, existing?.path);
}

// ─── Add MCP Server to Config ────────────────────────────────────────
export async function addMcpToConfig(
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>
): Promise<void> {
  const existing = await readOpenCodeConfig();
  const config: OpenCodeConfig = existing?.config || {};

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers[name] = {
    type: 'stdio',
    command,
    args,
    ...(env && Object.keys(env).length > 0 ? { env } : {}),
  };

  await writeOpenCodeConfig(config, existing?.path);
}

// ─── Remove MCP Server from Config ──────────────────────────────────
export async function removeMcpFromConfig(name: string): Promise<boolean> {
  const existing = await readOpenCodeConfig();
  if (!existing?.config?.mcpServers?.[name]) return false;

  delete existing.config.mcpServers[name];
  await writeOpenCodeConfig(existing.config, existing.path);
  return true;
}

// ─── Find OpenCode Config Path ──────────────────────────────────────
export function findOpencodeConfig(): string {
  // Check project-local first, then global
  const localPaths = [
    resolve(process.cwd(), 'opencode.json'),
    resolve(process.cwd(), '.opencode.json'),
  ];
  for (const p of localPaths) {
    if (existsSync(p)) return p;
  }
  // Global config
  const globalPath = resolve(homedir(), '.config', 'opencode', 'opencode.json');
  return globalPath; // Return global path even if doesn't exist (will create)
}

// ─── Check oh-my-opencode Installation ──────────────────────────────
export async function checkOhMyOpenCode(): Promise<boolean> {
  // Check in common locations
  const paths = [
    resolve(homedir(), '.cache', 'opencode', 'node_modules', 'oh-my-opencode'),
    resolve(homedir(), '.config', 'opencode', 'node_modules', 'oh-my-opencode'),
  ];
  return paths.some(p => existsSync(p));
}
