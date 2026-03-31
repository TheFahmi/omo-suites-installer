import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { TEST_HOME } = vi.hoisted(() => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  return { TEST_HOME: join(tmpdir(), `omocs-test-${randomBytes(4).toString('hex')}`) };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Import after mocking
import {
  ensureConfigDir,
  getConfigDir,
  getConfigPath,
  readConfig,
  writeConfig,
  updateConfig,
  getActiveProfile,
  setActiveProfile,
  getActiveAgent,
  setActiveAgent,
  getAccounts,
  addAccount,
  removeAccount,
  configExists,
  type OmocsConfig,
  type AccountEntry,
} from '../../src/core/config.ts';

describe('core/config', () => {
  beforeEach(() => {
    // Ensure clean test home
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  // ─── ensureConfigDir ─────────────────────────────────────────────
  describe('ensureConfigDir', () => {
    it('should create the .omocs directory if it does not exist', () => {
      const dir = ensureConfigDir();
      expect(existsSync(dir)).toBe(true);
      expect(dir).toBe(join(TEST_HOME, '.omocs'));
    });

    it('should not throw if directory already exists', () => {
      ensureConfigDir();
      expect(() => ensureConfigDir()).not.toThrow();
    });
  });

  // ─── getConfigDir / getConfigPath ────────────────────────────────
  describe('getConfigDir / getConfigPath', () => {
    it('should return paths under home directory', () => {
      expect(getConfigDir()).toBe(join(TEST_HOME, '.omocs'));
      expect(getConfigPath()).toBe(join(TEST_HOME, '.omocs', 'config.json'));
    });
  });

  // ─── readConfig ──────────────────────────────────────────────────
  describe('readConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = readConfig();
      expect(config.version).toBe('1.0.0');
      expect(config.activeProfile).toBe('balanced');
      expect(config.activeAgent).toBe('sisyphus');
      expect(config.accounts).toEqual({});
      expect(config.preferences.autoRotate).toBe(false);
    });

    it('should read and merge with defaults when config file exists', () => {
      ensureConfigDir();
      const partial = { activeProfile: 'custom', accounts: { openai: [] } };
      writeFileSync(getConfigPath(), JSON.stringify(partial));

      const config = readConfig();
      expect(config.activeProfile).toBe('custom');
      expect(config.accounts).toEqual({ openai: [] });
      // Defaults should be filled in
      expect(config.version).toBe('1.0.0');
      expect(config.activeAgent).toBe('sisyphus');
      expect(config.preferences.autoRotate).toBe(false);
    });

    it('should return default config on malformed JSON', () => {
      ensureConfigDir();
      writeFileSync(getConfigPath(), 'not valid json {{{');

      const config = readConfig();
      expect(config.version).toBe('1.0.0');
      expect(config.activeProfile).toBe('balanced');
    });
  });

  // ─── writeConfig ─────────────────────────────────────────────────
  describe('writeConfig', () => {
    it('should write config atomically', () => {
      const config: OmocsConfig = {
        version: '1.0.0',
        activeProfile: 'test-profile',
        activeAgent: 'atlas',
        accounts: {},
        preferences: { autoRotate: true },
      };

      writeConfig(config);

      const raw = readFileSync(getConfigPath(), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.activeProfile).toBe('test-profile');
      expect(parsed.activeAgent).toBe('atlas');
      expect(parsed.preferences.autoRotate).toBe(true);
    });

    it('should overwrite existing config', () => {
      const config1: OmocsConfig = {
        version: '1.0.0',
        activeProfile: 'first',
        activeAgent: 'sisyphus',
        accounts: {},
        preferences: { autoRotate: false },
      };
      writeConfig(config1);

      const config2: OmocsConfig = {
        ...config1,
        activeProfile: 'second',
      };
      writeConfig(config2);

      const result = readConfig();
      expect(result.activeProfile).toBe('second');
    });
  });

  // ─── updateConfig ────────────────────────────────────────────────
  describe('updateConfig', () => {
    it('should apply updater function and persist', () => {
      const result = updateConfig(c => {
        c.activeProfile = 'updated';
        c.preferences.autoRotate = true;
      });

      expect(result.activeProfile).toBe('updated');
      expect(result.preferences.autoRotate).toBe(true);

      // Verify persistence
      const reRead = readConfig();
      expect(reRead.activeProfile).toBe('updated');
      expect(reRead.preferences.autoRotate).toBe(true);
    });
  });

  // ─── getActiveProfile / setActiveProfile ─────────────────────────
  describe('activeProfile getters/setters', () => {
    it('should get default active profile', () => {
      expect(getActiveProfile()).toBe('balanced');
    });

    it('should set and get active profile', () => {
      setActiveProfile('opus-4.6-all');
      expect(getActiveProfile()).toBe('opus-4.6-all');
    });
  });

  // ─── getActiveAgent / setActiveAgent ─────────────────────────────
  describe('activeAgent getters/setters', () => {
    it('should get default active agent', () => {
      expect(getActiveAgent()).toBe('sisyphus');
    });

    it('should set and get active agent', () => {
      setActiveAgent('atlas');
      expect(getActiveAgent()).toBe('atlas');
    });
  });

  // ─── getAccounts / addAccount / removeAccount ────────────────────
  describe('accounts management', () => {
    const testEntry: AccountEntry = {
      label: 'test-key',
      key: 'encrypted-key-data',
      priority: 1,
      status: 'active',
    };

    it('should return empty accounts by default', () => {
      expect(getAccounts()).toEqual({});
    });

    it('should add an account for a provider', () => {
      addAccount('openai', testEntry);
      const accounts = getAccounts();
      expect(accounts.openai).toHaveLength(1);
      expect(accounts.openai[0].label).toBe('test-key');
    });

    it('should add multiple accounts to same provider', () => {
      addAccount('openai', testEntry);
      addAccount('openai', { ...testEntry, label: 'second-key', priority: 2 });
      const accounts = getAccounts('openai');
      expect(accounts.openai).toHaveLength(2);
    });

    it('should get accounts filtered by provider', () => {
      addAccount('openai', testEntry);
      addAccount('anthropic', { ...testEntry, label: 'claude-key' });

      const openaiOnly = getAccounts('openai');
      expect(Object.keys(openaiOnly)).toEqual(['openai']);
      expect(openaiOnly.openai).toHaveLength(1);
    });

    it('should return empty array for unknown provider', () => {
      const result = getAccounts('nonexistent');
      expect(result.nonexistent).toEqual([]);
    });

    it('should remove an account by label', () => {
      addAccount('openai', testEntry);
      addAccount('openai', { ...testEntry, label: 'keep-this' });

      const removed = removeAccount('openai', 'test-key');
      expect(removed).toBe(true);

      const accounts = getAccounts('openai');
      expect(accounts.openai).toHaveLength(1);
      expect(accounts.openai[0].label).toBe('keep-this');
    });

    it('should return false when removing non-existent account', () => {
      addAccount('openai', testEntry);
      const removed = removeAccount('openai', 'does-not-exist');
      expect(removed).toBe(false);
    });

    it('should return false when removing from non-existent provider', () => {
      const removed = removeAccount('nonexistent', 'test-key');
      expect(removed).toBe(false);
    });
  });

  // ─── configExists ────────────────────────────────────────────────
  describe('configExists', () => {
    it('should return false when config file does not exist', () => {
      expect(configExists()).toBe(false);
    });

    it('should return true after writing config', () => {
      writeConfig(readConfig()); // writes default config
      expect(configExists()).toBe(true);
    });
  });
});
