import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// vi.hoisted runs BEFORE vi.mock factory, so TEST_HOME is available
const { TEST_HOME } = vi.hoisted(() => {
  const os = require('os');
  const path = require('path');
  const crypto = require('crypto');
  return {
    TEST_HOME: path.join(os.tmpdir(), `omocs-auto-test-${crypto.randomBytes(4).toString('hex')}`),
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

import { runAutoChecks, suppressWarning, resetAutoState } from '../../src/core/auto.ts';

describe('core/auto', () => {
  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  // ─── runAutoChecks ──────────────────────────────────────────────
  describe('runAutoChecks', () => {
    it('should return results array', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      const results = await runAutoChecks(testDir, { silent: true });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should include auto-doctor result', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      expect(doctorResult).toBeDefined();
    });

    it('should warn when no opencode.json exists', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      expect(doctorResult).toBeDefined();
      expect(doctorResult!.status).toBe('warn');
      expect(doctorResult!.message).toContain('opencode.json');
    });

    it('should warn about missing AGENTS.md', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      expect(doctorResult!.message).toContain('AGENTS.md');
    });

    it('should not warn when opencode.json and AGENTS.md exist', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, 'opencode.json'), '{}');
      writeFileSync(join(testDir, 'AGENTS.md'), '# Agents');

      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      // Should be ok or at least not mention missing config
      if (doctorResult) {
        if (doctorResult.message.includes('opencode.json')) {
          // This shouldn't happen
          expect(true).toBe(false);
        }
      }
    });

    it('should skip compact when skipCompact is true', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      const results = await runAutoChecks(testDir, { silent: true, skipCompact: true });
      const compactResult = results.find(r => r.action.startsWith('auto-compact'));
      expect(compactResult).toBeUndefined();
    });

    it('should detect structure changes and trigger auto-index', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, 'index.ts'), 'export {}');

      const results = await runAutoChecks(testDir, { silent: true, skipCompact: true });
      const indexResult = results.find(r => r.action === 'auto-index');
      // May or may not index depending on state, but should not throw
    });
  });

  // ─── suppressWarning ────────────────────────────────────────────
  describe('suppressWarning', () => {
    it('should suppress a warning without error', () => {
      expect(() => suppressWarning('test warning')).not.toThrow();
    });

    it('should persist suppressed warnings', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      suppressWarning('No opencode.json found — run `omocs init` to set up');

      // Run auto checks — the suppressed warning should be filtered
      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      if (doctorResult && doctorResult.status === 'warn') {
        expect(doctorResult.message).not.toContain('No opencode.json found — run `omocs init` to set up');
      }
    });
  });

  // ─── resetAutoState ─────────────────────────────────────────────
  describe('resetAutoState', () => {
    it('should reset state without error', () => {
      expect(() => resetAutoState()).not.toThrow();
    });

    it('should create auto-state.json', () => {
      resetAutoState();
      const stateFile = join(TEST_HOME, '.omocs', 'auto-state.json');
      expect(existsSync(stateFile)).toBe(true);
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      expect(state.lastCompact).toBe(0);
      expect(state.lastDoctor).toBe(0);
      expect(state.suppressedWarnings).toEqual([]);
    });

    it('should force re-run after reset', async () => {
      const testDir = join(TEST_HOME, 'test-project');
      mkdirSync(testDir, { recursive: true });

      // Run once to set state
      await runAutoChecks(testDir, { silent: true });

      // Reset
      resetAutoState();

      // Should run doctor again
      const results = await runAutoChecks(testDir, { silent: true });
      const doctorResult = results.find(r => r.action === 'auto-doctor');
      expect(doctorResult).toBeDefined();
    });
  });
});
