import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Walk up directories to find package.json.
 * Works in dev, built dist/, and npm-installed contexts.
 */
export function findPackageJson(fromUrl?: string): string {
  let dir = dirname(fileURLToPath(fromUrl || import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'package.json');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return resolve(dirname(dirname(fileURLToPath(fromUrl || import.meta.url))), 'package.json');
}

/**
 * Read and parse the nearest package.json.
 */
export function readPackageJson(fromUrl?: string): Record<string, any> {
  return JSON.parse(readFileSync(findPackageJson(fromUrl), 'utf-8'));
}
