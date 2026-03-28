import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const logDir = path.join(os.homedir(), '.omocs', 'logs');

function getLogFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `omocs-${date}.log`);
}

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export function logEvent(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) {
  if (process.env.OMOCS_NO_LOGS) return;
  
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({ timestamp, level, message, ...meta });
    fs.appendFileSync(getLogFile(), logLine + '\n');
  } catch (e) {
    // Silently fail if we can't write to logs
  }
}

export const logger = {
  info: (msg: string, meta?: any) => logEvent('INFO', msg, meta),
  warn: (msg: string, meta?: any) => logEvent('WARN', msg, meta),
  error: (msg: string, meta?: any) => logEvent('ERROR', msg, meta),
};
