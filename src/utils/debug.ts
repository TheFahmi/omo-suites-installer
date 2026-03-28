import chalk from 'chalk';

let _debug = false;
let _verbose = false;

export function setDebug(enabled: boolean): void {
  _debug = enabled;
  if (enabled) process.env.DEBUG = '1';
}

export function setVerbose(enabled: boolean): void {
  _verbose = enabled;
}

export function isDebug(): boolean {
  return _debug || process.env.DEBUG === '1';
}

export function isVerbose(): boolean {
  return _verbose || isDebug();
}

export function debugLog(domain: string, ...args: unknown[]): void {
  if (!isDebug()) return;
  console.log(chalk.gray(`[DEBUG] [${domain}]`), ...args);
}

export function verboseLog(domain: string, ...args: unknown[]): void {
  if (!isVerbose()) return;
  console.log(chalk.gray(`[VERBOSE] [${domain}]`), ...args);
}
