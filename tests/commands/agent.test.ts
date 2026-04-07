import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { Command } from 'commander';

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { TEST_HOME } = vi.hoisted(() => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  return { TEST_HOME: join(tmpdir(), `omocs-agent-${randomBytes(4).toString('hex')}`) };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Mock inquirer to avoid interactive prompts
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ id: 'sisyphus' }),
  },
}));

function silenceConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}

import { registerAgentCommand } from '../../src/commands/agent.ts';
import { getActiveAgent, setActiveAgent, ensureConfigDir } from '../../src/core/config.ts';
import { agents, getAgent, listAgentIds, categoryRouting, getAgentForCategory, listCategories } from '../../src/data/agents.ts';

describe('commands/agent', () => {
  let program: Command;

  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });

    program = new Command();
    program.name('omocs').exitOverride();
    registerAgentCommand(program);
    silenceConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  // ─── command structure ────────────────────────────────────────────
  describe('command structure', () => {
    it('should register agent command with subcommands', () => {
      const cmd = program.commands.find(c => c.name() === 'agent');
      expect(cmd).toBeDefined();
      const subNames = cmd!.commands.map(c => c.name());
      expect(subNames).toContain('list');
      expect(subNames).toContain('use');
      expect(subNames).toContain('create');
      expect(subNames).toContain('info');
      expect(subNames).toContain('categories');
      expect(subNames).toContain('route');
    });
  });

  // ─── agent list ──────────────────────────────────────────────────
  describe('agent list', () => {
    it('should list all agents without error', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'list']);
      expect(logSpy).toHaveBeenCalled();
    });

    it('should show active agent and total count', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'list']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Active');
      expect(output).toContain('Total');
    });

    it('should include built-in agents in listing', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'list']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Sisyphus');
    });
  });

  // ─── agent use ───────────────────────────────────────────────────
  describe('agent use', () => {
    it('should switch to a valid agent', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'use', 'atlas']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/switched|atlas/i);
    });

    it('should update active agent in config', async () => {
      await program.parseAsync(['node', 'omocs', 'agent', 'use', 'prometheus']);
      const active = getActiveAgent();
      expect(active).toBe('prometheus');
    });

    it('should fail for non-existent agent', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'use', 'nonexistent-agent']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/not found/i);
    });

    it('should switch to all core agents', async () => {
      const coreAgents = ['sisyphus', 'atlas', 'prometheus', 'metis', 'momus'];
      for (const agentId of coreAgents) {
        await program.parseAsync(['node', 'omocs', 'agent', 'use', agentId]);
        expect(getActiveAgent()).toBe(agentId);
      }
    });
  });

  // ─── agent categories ────────────────────────────────────────────
  describe('agent categories', () => {
    it('should list all categories without error', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'categories']);
      expect(logSpy).toHaveBeenCalled();
    });

    it('should show category count', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'categories']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Total categories');
    });
  });

  // ─── agent route ─────────────────────────────────────────────────
  describe('agent route', () => {
    it('should route a known category', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'route', 'deep']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/sisyphus|deep/i);
    });

    it('should fail for unknown category', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'route', 'nonexistent-category']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/unknown/i);
    });

    it('should route code-review to momus', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'route', 'code-review']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/momus/i);
    });

    it('should route security to security engineer', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'route', 'security']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/security/i);
    });
  });

  // ─── agent info ──────────────────────────────────────────────────
  describe('agent info', () => {
    it('should show info for a valid agent', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'info', 'sisyphus']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Sisyphus');
    });

    it('should fail for non-existent agent info', async () => {
      const logSpy = vi.spyOn(console, 'log');
      await program.parseAsync(['node', 'omocs', 'agent', 'info', 'nonexistent']);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/not found/i);
    });
  });
});
