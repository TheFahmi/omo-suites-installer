import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { detectStack, suggestLSPs, type DetectedStack } from '../../src/utils/detect.ts';

describe('utils/detect', () => {
  const TEST_DIR = join(tmpdir(), `omocs-detect-test-${randomBytes(4).toString('hex')}`);

  function setup(files: Record<string, string | object> = {}) {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(TEST_DIR, path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (dir !== TEST_DIR) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content));
    }
  }

  function cleanup() {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  }

  afterEach(cleanup);

  // ─── detectStack ─────────────────────────────────────────────────
  describe('detectStack', () => {
    it('should detect TypeScript from tsconfig.json', () => {
      setup({ 'tsconfig.json': '{}' });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('typescript');
    });

    it('should detect JavaScript from package.json', () => {
      setup({ 'package.json': { name: 'test' } });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('javascript');
    });

    it('should detect Python from pyproject.toml', () => {
      setup({ 'pyproject.toml': '[tool.poetry]' });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('python');
    });

    it('should detect Go from go.mod', () => {
      setup({ 'go.mod': 'module example.com/test' });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('go');
    });

    it('should detect Rust from Cargo.toml', () => {
      setup({ 'Cargo.toml': '[package]' });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('rust');
    });

    it('should detect NestJS framework', () => {
      setup({ 'nest-cli.json': '{}' });
      const stack = detectStack(TEST_DIR);
      expect(stack.frameworks).toContain('nestjs');
    });

    it('should detect Next.js framework', () => {
      setup({ 'next.config.ts': 'export default {}' });
      const stack = detectStack(TEST_DIR);
      expect(stack.frameworks).toContain('nextjs');
    });

    it('should detect Docker tool', () => {
      setup({ 'Dockerfile': 'FROM node:18' });
      const stack = detectStack(TEST_DIR);
      expect(stack.tools).toContain('docker');
    });

    it('should detect Tailwind tool', () => {
      setup({ 'tailwind.config.ts': 'export default {}' });
      const stack = detectStack(TEST_DIR);
      expect(stack.tools).toContain('tailwind');
    });

    it('should detect package managers', () => {
      setup({ 'pnpm-lock.yaml': '', 'package.json': {} });
      const stack = detectStack(TEST_DIR);
      expect(stack.packageManager).toBe('pnpm');
    });

    it('should detect bun package manager', () => {
      setup({ 'bun.lockb': '' });
      const stack = detectStack(TEST_DIR);
      expect(stack.packageManager).toBe('bun');
    });

    it('should detect yarn package manager', () => {
      setup({ 'yarn.lock': '' });
      const stack = detectStack(TEST_DIR);
      expect(stack.packageManager).toBe('yarn');
    });

    it('should detect npm package manager', () => {
      setup({ 'package-lock.json': '{}' });
      const stack = detectStack(TEST_DIR);
      expect(stack.packageManager).toBe('npm');
    });

    it('should return null for no package manager', () => {
      setup({});
      const stack = detectStack(TEST_DIR);
      expect(stack.packageManager).toBeNull();
    });

    it('should detect Python from .py file extensions', () => {
      setup({ 'main.py': 'print("hello")' });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('python');
    });

    it('should detect multiple technologies at once', () => {
      setup({
        'tsconfig.json': '{}',
        'package.json': { name: 'test' },
        'Dockerfile': 'FROM node:18',
        'next.config.ts': '',
        'tailwind.config.ts': '',
        'pnpm-lock.yaml': '',
      });
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toContain('typescript');
      expect(stack.languages).toContain('javascript');
      expect(stack.frameworks).toContain('nextjs');
      expect(stack.tools).toContain('docker');
      expect(stack.tools).toContain('tailwind');
      expect(stack.packageManager).toBe('pnpm');
    });

    it('should return empty arrays for empty directory', () => {
      setup({});
      const stack = detectStack(TEST_DIR);
      expect(stack.languages).toEqual([]);
      expect(stack.frameworks).toEqual([]);
      expect(stack.tools).toEqual([]);
    });
  });

  // ─── suggestLSPs ─────────────────────────────────────────────────
  describe('suggestLSPs', () => {
    it('should suggest typescript LSP for TS/JS projects', () => {
      const stack: DetectedStack = {
        languages: ['typescript', 'javascript'],
        frameworks: [],
        tools: [],
        packageManager: null,
      };
      const suggestions = suggestLSPs(stack);
      expect(suggestions).toContain('typescript');
      // Should not duplicate
      expect(suggestions.filter(s => s === 'typescript')).toHaveLength(1);
    });

    it('should suggest python LSP for Python projects', () => {
      const stack: DetectedStack = {
        languages: ['python'],
        frameworks: [],
        tools: [],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toContain('python');
    });

    it('should suggest go LSP for Go projects', () => {
      const stack: DetectedStack = {
        languages: ['go'],
        frameworks: [],
        tools: [],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toContain('go');
    });

    it('should suggest rust LSP for Rust projects', () => {
      const stack: DetectedStack = {
        languages: ['rust'],
        frameworks: [],
        tools: [],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toContain('rust');
    });

    it('should suggest dockerfile LSP when Docker is detected', () => {
      const stack: DetectedStack = {
        languages: [],
        frameworks: [],
        tools: ['docker'],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toContain('dockerfile');
    });

    it('should suggest yaml LSP when yaml files detected', () => {
      const stack: DetectedStack = {
        languages: [],
        frameworks: [],
        tools: ['yaml'],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toContain('yaml');
    });

    it('should return empty for unknown languages', () => {
      const stack: DetectedStack = {
        languages: ['ruby'],
        frameworks: [],
        tools: [],
        packageManager: null,
      };
      expect(suggestLSPs(stack)).toEqual([]);
    });
  });
});
