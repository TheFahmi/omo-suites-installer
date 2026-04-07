import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { TEST_HOME } = vi.hoisted(() => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  return { TEST_HOME: join(tmpdir(), `omocs-doctor-${randomBytes(4).toString('hex')}`) };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Mock ora spinner — must support property assignment (spinner.text = ...)
vi.mock('ora', () => {
  return {
    default: vi.fn(() => {
      const spinner: Record<string, any> = {
        text: '',
        color: 'cyan',
      };
      spinner.start = vi.fn(() => spinner);
      spinner.stop = vi.fn(() => spinner);
      spinner.succeed = vi.fn(() => spinner);
      spinner.fail = vi.fn(() => spinner);
      spinner.warn = vi.fn(() => spinner);
      spinner.info = vi.fn(() => spinner);
      return spinner;
    }),
  };
});

// Mock shell.ts to control command existence checks
vi.mock('../../src/utils/shell.ts', () => ({
  commandExists: vi.fn().mockResolvedValue(false),
  getCommandVersion: vi.fn().mockResolvedValue(null),
  run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 1, success: false }),
}));

// Mock opencode detection
vi.mock('../../src/core/opencode.ts', () => ({
  detectOpenCode: vi.fn().mockResolvedValue({ installed: false, version: null }),
  readOpenCodeConfig: vi.fn().mockResolvedValue(null),
  findOpencodeConfig: vi.fn().mockReturnValue(null),
  mergeProfile: vi.fn(),
}));

// Mock network to avoid real HTTP calls
vi.mock('../../src/utils/network.ts', () => ({
  fetchWithRetry: vi.fn().mockRejectedValue(new Error('mocked')),
}));

// Silence console and prevent process.exit
function silenceConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
}

import { registerDoctorCommand } from '../../src/commands/doctor.ts';
import { commandExists, getCommandVersion } from '../../src/utils/shell.ts';
import { detectOpenCode, readOpenCodeConfig } from '../../src/core/opencode.ts';

describe('commands/doctor', () => {
  let program: Command;

  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });

    program = new Command();
    program.name('omocs').exitOverride();
    registerDoctorCommand(program);

    // Reset mock defaults before each test
    vi.mocked(commandExists).mockResolvedValue(false);
    vi.mocked(getCommandVersion).mockResolvedValue(null);
    vi.mocked(detectOpenCode).mockResolvedValue({ installed: false, version: null });
    vi.mocked(readOpenCodeConfig).mockResolvedValue(null);

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
    it('should register doctor command', () => {
      const cmd = program.commands.find(c => c.name() === 'doctor');
      expect(cmd).toBeDefined();
    });

    it('should have verbose option', () => {
      const cmd = program.commands.find(c => c.name() === 'doctor');
      expect(cmd).toBeDefined();
      const opts = cmd!.options.map(o => o.long);
      expect(opts).toContain('--verbose');
    });
  });

  // ─── health checks ───────────────────────────────────────────────
  describe('health checks', () => {
    it('should run without crashing when nothing is installed', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      expect(logSpy).toHaveBeenCalled();
    });

    it('should report OpenCode check when installed', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: true, version: '1.2.0' });
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('OpenCode');
    });

    it('should check for bun, node, git and report them', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: false, version: null });
      vi.mocked(commandExists).mockImplementation(async (cmd: string) => {
        if (cmd === 'bun') return true;
        if (cmd === 'node') return true;
        if (cmd === 'git') return true;
        return false;
      });
      vi.mocked(getCommandVersion).mockImplementation(async (cmd: string) => {
        if (cmd === 'bun') return '1.0.0';
        if (cmd === 'node') return 'v20.0.0';
        if (cmd === 'git') return '2.40.0';
        return null;
      });

      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Bun');
      expect(output).toContain('Node');
      expect(output).toContain('Git');
    });

    it('should show summary with pass/fail/warn counts', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: false, version: null });
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/passed|failed|warning/i);
    });

    it('should run with verbose flag without crashing', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: false, version: null });
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor', '--verbose']);
      expect(logSpy).toHaveBeenCalled();
    });
  });

  // ─── edge cases ───────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should handle API key check with env variables', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: false, version: null });
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('API Keys');
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should handle when opencode is installed with no config', async () => {
      vi.mocked(detectOpenCode).mockResolvedValue({ installed: true, version: '1.0.0' });
      vi.mocked(readOpenCodeConfig).mockResolvedValue(null);
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'doctor']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('OpenCode');
    });
  });
});
