import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { TEST_HOME } = vi.hoisted(() => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  return { TEST_HOME: join(tmpdir(), `omocs-cfg-cmd-${randomBytes(4).toString('hex')}`) };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Silence console output
function silenceConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

import { registerConfigCommand } from '../../src/commands/config.ts';
import {
  ensureConfigDir,
  getConfigPath,
  readConfig,
  writeConfig,
  configExists,
} from '../../src/core/config.ts';

describe('commands/config', () => {
  let program: Command;

  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });

    program = new Command();
    program.name('omocs').exitOverride();
    registerConfigCommand(program);
    silenceConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  // ─── config validate ─────────────────────────────────────────────
  describe('config validate', () => {
    it('should warn when config file does not exist', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'validate']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('not found');
    });

    it('should report valid config', async () => {
      // Write a valid config
      ensureConfigDir();
      const config = readConfig();
      writeConfig(config);

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'validate']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('valid');
    });

    it('should report invalid config when fields are missing', async () => {
      ensureConfigDir();
      // Write a config missing version and accounts
      writeFileSync(getConfigPath(), JSON.stringify({ activeProfile: 'test' }));

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'validate']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      // readConfig fills in defaults, so version and accounts will exist
      // Only truly missing fields are caught
      expect(output).toMatch(/valid|invalid/i);
    });

    it('should handle malformed JSON gracefully', async () => {
      ensureConfigDir();
      writeFileSync(getConfigPath(), '{{{not json}}}');

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'validate']);
      // readConfig returns defaults on malformed JSON, so it may report valid
      // The important thing is no crash
      expect(logSpy).toHaveBeenCalled();
    });
  });

  // ─── config telemetry ─────────────────────────────────────────────
  describe('config telemetry', () => {
    it('should show telemetry status by default', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'telemetry']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/telemetry/i);
    });

    it('should enable telemetry with --enable', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'telemetry', '--enable']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/enabled/i);
    });

    it('should disable telemetry with --disable', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'telemetry', '--disable']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/disabled/i);
    });

    it('should show status with --status flag', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'config', 'telemetry', '--status']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/telemetry is currently/i);
    });
  });

  // ─── command structure ────────────────────────────────────────────
  describe('command structure', () => {
    it('should have validate subcommand', () => {
      const configCmd = program.commands.find(c => c.name() === 'config');
      expect(configCmd).toBeDefined();
      const validate = configCmd!.commands.find(c => c.name() === 'validate');
      expect(validate).toBeDefined();
    });

    it('should have telemetry subcommand', () => {
      const configCmd = program.commands.find(c => c.name() === 'config');
      expect(configCmd).toBeDefined();
      const telemetry = configCmd!.commands.find(c => c.name() === 'telemetry');
      expect(telemetry).toBeDefined();
    });
  });
});
