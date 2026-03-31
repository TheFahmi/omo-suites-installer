import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const { TEST_HOME } = vi.hoisted(() => {
  const os = require('os');
  const path = require('path');
  const crypto = require('crypto');
  return {
    TEST_HOME: path.join(os.tmpdir(), `omocs-telem-test-${crypto.randomBytes(4).toString('hex')}`),
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

import { setTelemetryEnabled, isTelemetryEnabled, trackEvent } from '../../src/utils/telemetry.ts';

describe('utils/telemetry', () => {
  const configPath = join(TEST_HOME, '.omocs', 'telemetry-config.json');
  const telemetryDir = join(TEST_HOME, '.omocs', 'telemetry');

  beforeEach(() => {
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

  describe('isTelemetryEnabled', () => {
    it('should default to disabled', () => {
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('setTelemetryEnabled', () => {
    it('should enable telemetry and persist', () => {
      setTelemetryEnabled(true);
      expect(isTelemetryEnabled()).toBe(true);
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(raw.enabled).toBe(true);
    });

    it('should disable telemetry', () => {
      setTelemetryEnabled(true);
      setTelemetryEnabled(false);
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should preserve machineId across toggles', () => {
      setTelemetryEnabled(true);
      const config1 = JSON.parse(readFileSync(configPath, 'utf-8'));
      setTelemetryEnabled(false);
      const config2 = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config1.machineId).toBe(config2.machineId);
    });
  });

  describe('trackEvent', () => {
    it('should not write events when telemetry is disabled', () => {
      trackEvent('test-action');
      expect(existsSync(telemetryDir)).toBe(false);
    });

    it('should write events when telemetry is enabled', () => {
      setTelemetryEnabled(true);
      trackEvent('cli-init', { plugin: 'omocs', status: 'success' });

      // Check that a log file was created
      expect(existsSync(telemetryDir)).toBe(true);
      const files = require('fs').readdirSync(telemetryDir).filter((f: string) => f.startsWith('events-'));
      expect(files.length).toBeGreaterThan(0);

      // Read and parse the JSONL
      const content = readFileSync(join(telemetryDir, files[0]), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);
      const event = JSON.parse(lines[0]);
      expect(event.action).toBe('cli-init');
      expect(event.plugin).toBe('omocs');
      expect(event.status).toBe('success');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });
});
