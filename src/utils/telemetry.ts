import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const OMO_DIR = join(homedir(), '.omocs');
const TELEMETRY_DIR = join(OMO_DIR, 'telemetry');
const CONFIG_FILE = join(OMO_DIR, 'telemetry-config.json');

interface TelemetryConfig {
  enabled: boolean;
  machineId: string;
}

interface TelemetryEvent {
  id: string;
  timestamp: string;
  action: string;
  plugin?: string;
  status?: string;
  durationMs?: number;
  machineId: string;
}

function getTelemetryConfig(): TelemetryConfig {
  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig: TelemetryConfig = {
      enabled: false,
      machineId: randomUUID(),
    };
    if (!existsSync(OMO_DIR)) {
      mkdirSync(OMO_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    return defaultConfig;
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { enabled: false, machineId: randomUUID() };
  }
}

export function setTelemetryEnabled(enabled: boolean): void {
  const config = getTelemetryConfig();
  config.enabled = enabled;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function isTelemetryEnabled(): boolean {
  return getTelemetryConfig().enabled;
}

export function trackEvent(action: string, metadata?: { plugin?: string, status?: string, durationMs?: number, error?: string }): void {
  const config = getTelemetryConfig();
  if (!config.enabled) return;

  try {
    if (!existsSync(TELEMETRY_DIR)) {
      mkdirSync(TELEMETRY_DIR, { recursive: true });
    }

    const event: TelemetryEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      machineId: config.machineId,
      ...metadata
    };

    // Local event capture
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = join(TELEMETRY_DIR, `events-${dateStr}.jsonl`);
    
    const { appendFileSync } = require('fs');
    appendFileSync(logFile, JSON.stringify(event) + '\n', 'utf-8');
  } catch (err) {
    // Fail silently, telemetry should never break the app
  }
}