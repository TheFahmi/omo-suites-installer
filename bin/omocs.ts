#!/usr/bin/env bun

// If no command given (just `omocs`), launch TUI dashboard
if (process.argv.length <= 2) {
  const { startTUI } = await import('../src/tui/index.ts');
  await startTUI();
} else {
  // Has command — use commander CLI as before
  const { program } = await import('../src/index.ts');
  program.parse();
}
