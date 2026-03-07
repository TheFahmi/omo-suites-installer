#!/usr/bin/env node

import { checkAndUpdate } from '../src/utils/updater.ts';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Find package.json for current version
function findPackageJson(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'package.json');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return resolve(dirname(dirname(fileURLToPath(import.meta.url))), 'package.json');
}

const pkg = JSON.parse(readFileSync(findPackageJson(), 'utf-8'));

// Auto-update check (skips if checked within last 5 min)
await checkAndUpdate(pkg.version);

// If no command given (just `omocs`), launch TUI dashboard
if (process.argv.length <= 2) {
  const { startTUI } = await import('../src/tui/index.ts');
  await startTUI();
} else {
  // Has command — use commander CLI as before
  const { program } = await import('../src/index.ts');
  program.parse();
}
