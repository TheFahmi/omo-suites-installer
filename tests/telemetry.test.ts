import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setTelemetryEnabled, isTelemetryEnabled, trackEvent } from '../src/utils/telemetry.ts';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

describe('Telemetry module', () => {
  const configPath = join(homedir(), '.omocs', 'telemetry-config.json');
  
  beforeEach(() => {
    if (existsSync(configPath)) rmSync(configPath);
  });
  
  it('should default to disabled', () => {
    expect(isTelemetryEnabled()).toBe(false);
  });
  
  it('should enable and save config', () => {
    setTelemetryEnabled(true);
    expect(isTelemetryEnabled()).toBe(true);
    expect(JSON.parse(readFileSync(configPath, 'utf8')).enabled).toBe(true);
  });
});