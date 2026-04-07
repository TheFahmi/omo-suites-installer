import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { TEST_HOME } = vi.hoisted(() => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  return { TEST_HOME: join(tmpdir(), `omocs-profile-${randomBytes(4).toString('hex')}`) };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Mock ora to avoid TTY issues
vi.mock('ora', () => {
  const mockSpinner = { text: '' };
  mockSpinner.start = vi.fn(() => mockSpinner);
  mockSpinner.stop = vi.fn(() => mockSpinner);
  mockSpinner.succeed = vi.fn(() => mockSpinner);
  mockSpinner.fail = vi.fn(() => mockSpinner);
  return { 
    default: vi.fn(() => mockSpinner),
    ora: vi.fn(() => mockSpinner),
    oraPromise: vi.fn(() => Promise.resolve())
  };
});

// Mock inquirer to avoid interactive prompts in tests
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ key: 'opus-4.6-all' }),
  },
}));

// Mock opencode to avoid real filesystem operations
vi.mock('../../src/core/opencode.ts', () => ({
  mergeProfile: vi.fn().mockResolvedValue(undefined),
  readOpenCodeConfig: vi.fn().mockResolvedValue(null),
  findOpencodeConfig: vi.fn().mockReturnValue(null),
  detectOpenCode: vi.fn().mockResolvedValue({ installed: false }),
}));

function silenceConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
}

import { registerProfileCommand } from '../../src/commands/profile.ts';
import { readConfig, setActiveProfile, getActiveProfile, ensureConfigDir, writeConfig } from '../../src/core/config.ts';
import { getProfile, listProfileKeys } from '../../src/data/profiles.ts';

describe('commands/profile', () => {
  let program: Command;

  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });

    program = new Command();
    program.name('omocs').exitOverride();
    registerProfileCommand(program);
    silenceConsole();
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  // ─── command structure ────────────────────────────────────────────
  describe('command structure', () => {
    it('should register profile command with subcommands', () => {
      const cmd = program.commands.find(c => c.name() === 'profile');
      expect(cmd).toBeDefined();
      const subNames = cmd!.commands.map(c => c.name());
      expect(subNames).toContain('list');
      expect(subNames).toContain('use');
      expect(subNames).toContain('create');
      expect(subNames).toContain('export');
      expect(subNames).toContain('import');
    });
  });

  // ─── profile list ────────────────────────────────────────────────
  describe('profile list', () => {
    it('should list all profiles without error', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'list']);
      expect(logSpy).toHaveBeenCalled();
    });

    it('should show active profile indicator', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'list']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Active');
    });
  });

  // ─── profile use ─────────────────────────────────────────────────
  describe('profile use', () => {
    it('should switch to a valid built-in profile', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'use', 'opus-4.6-all']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      // Should succeed without error
      expect(output).toMatch(/switched|opus/i);
    });

    it('should fail for non-existent profile', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'use', 'nonexistent-profile']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/not found/i);
    });

    it('should update active profile in config', async () => {
      await program.parseAsync(['node', 'omocs', 'profile', 'use', 'sonnet-4.6-all']);
      const active = getActiveProfile();
      expect(active).toBe('sonnet-4.6-all');
    });
  });

  // ─── profile export ──────────────────────────────────────────────
  describe('profile export', () => {
    it('should export active profile as JSON', async () => {
      // Set a known active profile
      ensureConfigDir();
      setActiveProfile('opus-4.6-all');

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'export']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      // Should contain JSON with profile data
      expect(output).toContain('opus-4.6-all');
    });

    it('should export a specific profile by key', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'export', 'sonnet-4.6-all']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('sonnet-4.6-all');
    });

    it('should fail for non-existent profile export', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'export', 'nonexistent']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/not found/i);
    });
  });

  // ─── profile import ──────────────────────────────────────────────
  describe('profile import', () => {
    it('should import a valid profile JSON file', async () => {
      // Ensure .omocs dir exists for custom profiles store
      ensureConfigDir();

      const importData = {
        key: 'test-imported',
        name: 'Test Imported',
        description: 'A test imported profile',
        agents: { coder: 'claude-4', task: 'claude-4', title: 'claude-3.5-haiku' },
        settings: { autoCompact: true },
      };
      const importFile = join(TEST_HOME, 'import-test.json');
      writeFileSync(importFile, JSON.stringify(importData));

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'import', importFile]);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/imported/i);
    });

    it('should fail on invalid profile format', async () => {
      const invalidData = { invalid: true };
      const importFile = join(TEST_HOME, 'invalid-import.json');
      writeFileSync(importFile, JSON.stringify(invalidData));

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'profile', 'import', importFile]);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/invalid|required/i);
    });
  });
});
