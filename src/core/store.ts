import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from './config.ts';

// ─── Generic JSON Store ──────────────────────────────────────────────
export class Store<T extends Record<string, unknown>> {
  private filePath: string;
  private defaults: T;

  constructor(filename: string, defaults: T) {
    ensureConfigDir();
    this.filePath = join(getConfigDir(), filename);
    this.defaults = defaults;
  }

  async read(): Promise<T> {
    if (!existsSync(this.filePath)) {
      return { ...this.defaults };
    }
    try {
      const file = Bun.file(this.filePath);
      const text = await file.text();
      return { ...this.defaults, ...JSON.parse(text) };
    } catch {
      return { ...this.defaults };
    }
  }

  async write(data: T): Promise<void> {
    await Bun.write(this.filePath, JSON.stringify(data, null, 2));
  }

  async update(updater: (data: T) => void): Promise<T> {
    const data = await this.read();
    updater(data);
    await this.write(data);
    return data;
  }

  async get<K extends keyof T>(key: K): Promise<T[K]> {
    const data = await this.read();
    return data[key];
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.update(data => { data[key] = value; });
  }

  async exists(): Promise<boolean> {
    return existsSync(this.filePath);
  }

  async delete(): Promise<void> {
    if (existsSync(this.filePath)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(this.filePath);
    }
  }

  getPath(): string {
    return this.filePath;
  }
}

// ─── Usage Stats Store ───────────────────────────────────────────────
export interface UsageEntry {
  date: string;
  sessions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface UsageStore {
  entries: UsageEntry[];
  lastUpdated: string;
}

export const usageStore = new Store<UsageStore>('usage.json', {
  entries: [],
  lastUpdated: new Date().toISOString(),
});

// ─── Custom Profiles Store ──────────────────────────────────────────
export interface CustomProfile {
  name: string;
  description: string;
  agents: {
    coder: string;
    task: string;
    title: string;
  };
  settings: {
    autoCompact: boolean;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface CustomProfilesStore {
  profiles: Record<string, CustomProfile>;
}

export const customProfilesStore = new Store<CustomProfilesStore>('custom-profiles.json', {
  profiles: {},
});

// ─── Custom Agents Store ─────────────────────────────────────────────
export interface CustomAgent {
  name: string;
  description: string;
  systemPrompt: string;
  preferredModel: string;
  tools: string[];
  createdAt: string;
}

export interface CustomAgentsStore {
  agents: Record<string, CustomAgent>;
}

export const customAgentsStore = new Store<CustomAgentsStore>('custom-agents.json', {
  agents: {},
});
