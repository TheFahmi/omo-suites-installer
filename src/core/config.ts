import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';

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
export function readConfig(): OmocsConfig {
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

// ─── Write Config (atomic: write to temp file then rename) ───────────
export function writeConfig(config: OmocsConfig): void {
  ensureConfigDir();
  const tmpFile = CONFIG_FILE + '.tmp.' + randomBytes(4).toString('hex');
  try {
    writeFileSync(tmpFile, JSON.stringify(config, null, 2));
    renameSync(tmpFile, CONFIG_FILE);
  } catch (err) {
    // Clean up temp file on failure
    try { if (existsSync(tmpFile)) writeFileSync(tmpFile, ''); } catch {}
    throw err;
  }
}

// ─── Update Config ───────────────────────────────────────────────────
export function updateConfig(updater: (config: OmocsConfig) => void): OmocsConfig {
  const config = readConfig();
  updater(config);
  writeConfig(config);
  return config;
}

// ─── Config Getters/Setters ──────────────────────────────────────────
export function getActiveProfile(): string {
  const config = readConfig();
  return config.activeProfile;
}

export function setActiveProfile(profile: string): void {
  updateConfig(c => { c.activeProfile = profile; });
}

export function getActiveAgent(): string {
  const config = readConfig();
  return config.activeAgent;
}

export function setActiveAgent(agent: string): void {
  updateConfig(c => { c.activeAgent = agent; });
}

export function getAccounts(provider?: string): Record<string, AccountEntry[]> {
  const config = readConfig();
  if (provider) {
    return { [provider]: config.accounts[provider] || [] };
  }
  return config.accounts;
}

export function addAccount(provider: string, entry: AccountEntry): void {
  updateConfig(c => {
    if (!c.accounts[provider]) {
      c.accounts[provider] = [];
    }
    c.accounts[provider].push(entry);
  });
}

export function removeAccount(provider: string, label: string): boolean {
  let removed = false;
  updateConfig(c => {
    if (c.accounts[provider]) {
      const before = c.accounts[provider].length;
      c.accounts[provider] = c.accounts[provider].filter(a => a.label !== label);
      removed = c.accounts[provider].length < before;
    }
  });
  return removed;
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}
