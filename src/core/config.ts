import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Types ───────────────────────────────────────────────────────────
export interface AccountEntry {
  label: string;
  key: string; // encrypted
  priority: number;
  status: 'active' | 'rate-limited' | 'disabled';
  lastUsed?: string;
  lastError?: string;
}

export interface OmocsConfig {
  version: string;
  activeProfile: string;
  activeAgent: string;
  accounts: {
    [provider: string]: AccountEntry[];
  };
  preferences: {
    autoRotate: boolean;
    budgetLimit?: number;
    budgetPeriod?: 'daily' | 'weekly' | 'monthly';
  };
  masterPasswordHash?: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const CONFIG_DIR = join(homedir(), '.omocs');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const VERSION = '1.0.0';

// ─── Default Config ──────────────────────────────────────────────────
function defaultConfig(): OmocsConfig {
  return {
    version: VERSION,
    activeProfile: 'balanced',
    activeAgent: 'sisyphus',
    accounts: {},
    preferences: {
      autoRotate: false,
    },
  };
}

// ─── Ensure Config Dir ───────────────────────────────────────────────
export function ensureConfigDir(): string {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  return CONFIG_DIR;
}

// ─── Get Config Path ─────────────────────────────────────────────────
export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

// ─── Read Config ─────────────────────────────────────────────────────
export async function readConfig(): Promise<OmocsConfig> {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return defaultConfig();
  }
  try {
    const text = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(text);
    return { ...defaultConfig(), ...parsed };
  } catch {
    return defaultConfig();
  }
}

// ─── Write Config ────────────────────────────────────────────────────
export async function writeConfig(config: OmocsConfig): Promise<void> {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Update Config ───────────────────────────────────────────────────
export async function updateConfig(updater: (config: OmocsConfig) => void): Promise<OmocsConfig> {
  const config = await readConfig();
  updater(config);
  await writeConfig(config);
  return config;
}

// ─── Config Getters/Setters ──────────────────────────────────────────
export async function getActiveProfile(): Promise<string> {
  const config = await readConfig();
  return config.activeProfile;
}

export async function setActiveProfile(profile: string): Promise<void> {
  await updateConfig(c => { c.activeProfile = profile; });
}

export async function getActiveAgent(): Promise<string> {
  const config = await readConfig();
  return config.activeAgent;
}

export async function setActiveAgent(agent: string): Promise<void> {
  await updateConfig(c => { c.activeAgent = agent; });
}

export async function getAccounts(provider?: string): Promise<Record<string, AccountEntry[]>> {
  const config = await readConfig();
  if (provider) {
    return { [provider]: config.accounts[provider] || [] };
  }
  return config.accounts;
}

export async function addAccount(provider: string, entry: AccountEntry): Promise<void> {
  await updateConfig(c => {
    if (!c.accounts[provider]) {
      c.accounts[provider] = [];
    }
    c.accounts[provider].push(entry);
  });
}

export async function removeAccount(provider: string, label: string): Promise<boolean> {
  let removed = false;
  await updateConfig(c => {
    if (c.accounts[provider]) {
      const before = c.accounts[provider].length;
      c.accounts[provider] = c.accounts[provider].filter(a => a.label !== label);
      removed = c.accounts[provider].length < before;
    }
  });
  return removed;
}

export async function configExists(): Promise<boolean> {
  return existsSync(CONFIG_FILE);
}
