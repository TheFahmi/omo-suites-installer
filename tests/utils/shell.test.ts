import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run, commandExists, getCommandVersion } from '../../src/utils/shell.ts';

describe('utils/shell', () => {
  // ─── run ─────────────────────────────────────────────────────────
  describe('run', () => {
    it('should run a simple command and capture stdout', async () => {
      const result = await run('echo', ['hello world']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('hello world');
    });

    it('should capture stderr', async () => {
      const result = await run('bash', ['-c', 'echo error >&2']);
      expect(result.stderr).toBe('error');
    });

    it('should report non-zero exit code', async () => {
      const result = await run('bash', ['-c', 'exit 42']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(42);
    });

    it('should handle command not found', async () => {
      const result = await run('nonexistent-command-12345');
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should pass cwd option', async () => {
      const result = await run('pwd', [], { cwd: '/tmp' });
      expect(result.success).toBe(true);
      // Resolve symlinks, /tmp might be /private/tmp on macOS
      expect(result.stdout).toContain('tmp');
    });

    it('should pass env option', async () => {
      const result = await run('bash', ['-c', 'echo $MY_TEST_VAR'], {
        env: { MY_TEST_VAR: 'hello-from-test' },
      });
      expect(result.stdout).toBe('hello-from-test');
    });
  });

  // ─── commandExists ──────────────────────────────────────────────
  describe('commandExists', () => {
    it('should return true for existing command (echo)', async () => {
      const exists = await commandExists('echo');
      expect(exists).toBe(true);
    });

    it('should return true for bash', async () => {
      const exists = await commandExists('bash');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent command', async () => {
      const exists = await commandExists('nonexistent-cmd-xyz-123');
      expect(exists).toBe(false);
    });
  });

  // ─── getCommandVersion ──────────────────────────────────────────
  describe('getCommandVersion', () => {
    it('should return version for node', async () => {
      const version = await getCommandVersion('node');
      expect(version).not.toBeNull();
      expect(version).toMatch(/v?\d+\.\d+/);
    });

    it('should return null for non-existent command', async () => {
      const version = await getCommandVersion('nonexistent-cmd-xyz');
      expect(version).toBeNull();
    });
  });
});
