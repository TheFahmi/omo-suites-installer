#!/usr/bin/env node

import { checkAndUpdate } from '../src/utils/updater.ts';
import { readPackageJson } from '../src/utils/find-package-json.ts';

const pkg = readPackageJson(import.meta.url);

// CLI startup optimization: skip update check for --help and --version
const args = process.argv.slice(2);
const isHelpOrVersion = args.some(a => a === '--help' || a === '-h' || a === '--version' || a === '-v' || a === '-V');

if (!isHelpOrVersion) {
  // Auto-update check (skips if checked within last 5 min)
  await checkAndUpdate(pkg.version);
}

// If no command given (just `omocs`), launch TUI dashboard
if (process.argv.length <= 2) {
  const { startTUI } = await import('../src/tui/index.ts');
  await startTUI();
} else {
  // Has command — use commander CLI as before
  const { program } = await import('../src/index.ts');
  program.parse();
}
