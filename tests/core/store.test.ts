import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const { TEST_HOME } = vi.hoisted(() => {
  const os = require('os');
  const path = require('path');
  const crypto = require('crypto');
  return {
    TEST_HOME: path.join(os.tmpdir(), `omocs-store-test-${crypto.randomBytes(4).toString('hex')}`),
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

import { Store } from '../../src/core/store.ts';

interface TestData extends Record<string, unknown> {
  name: string;
  count: number;
  items: string[];
}

describe('core/store', () => {
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

  function createStore(filename = 'test-store.json') {
    return new Store<TestData>(filename, {
      name: 'default',
      count: 0,
      items: [],
    });
  }

  // ─── read ────────────────────────────────────────────────────────
  describe('read', () => {
    it('should return defaults when file does not exist', async () => {
      const store = createStore();
      const data = await store.read();
      expect(data.name).toBe('default');
      expect(data.count).toBe(0);
      expect(data.items).toEqual([]);
    });

    it('should merge file contents with defaults', async () => {
      const store = createStore();
      // Write partial data manually
      const dir = join(TEST_HOME, '.omocs');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'test-store.json'), JSON.stringify({ name: 'custom' }));

      const data = await store.read();
      expect(data.name).toBe('custom');
      expect(data.count).toBe(0); // from defaults
    });

    it('should return defaults on malformed JSON', async () => {
      const store = createStore();
      const dir = join(TEST_HOME, '.omocs');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'test-store.json'), '{bad json');

      const data = await store.read();
      expect(data.name).toBe('default');
    });
  });

  // ─── write ───────────────────────────────────────────────────────
  describe('write', () => {
    it('should write data to file', async () => {
      const store = createStore();
      await store.write({ name: 'written', count: 5, items: ['a', 'b'] });

      const raw = readFileSync(store.getPath(), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe('written');
      expect(parsed.count).toBe(5);
      expect(parsed.items).toEqual(['a', 'b']);
    });
  });

  // ─── update ──────────────────────────────────────────────────────
  describe('update', () => {
    it('should apply updater and persist', async () => {
      const store = createStore();
      const result = await store.update(data => {
        data.name = 'updated';
        data.count = 42;
      });

      expect(result.name).toBe('updated');
      expect(result.count).toBe(42);

      // Verify persistence
      const reRead = await store.read();
      expect(reRead.name).toBe('updated');
    });
  });

  // ─── get / set ──────────────────────────────────────────────────
  describe('get / set', () => {
    it('should get a value by key', async () => {
      const store = createStore();
      const name = await store.get('name');
      expect(name).toBe('default');
    });

    it('should set a value by key', async () => {
      const store = createStore();
      await store.set('count', 99);
      const count = await store.get('count');
      expect(count).toBe(99);
    });
  });

  // ─── exists ──────────────────────────────────────────────────────
  describe('exists', () => {
    it('should return false when file does not exist', async () => {
      const store = createStore('nonexistent.json');
      expect(await store.exists()).toBe(false);
    });

    it('should return true after write', async () => {
      const store = createStore();
      await store.write({ name: 'test', count: 0, items: [] });
      expect(await store.exists()).toBe(true);
    });
  });

  // ─── delete ──────────────────────────────────────────────────────
  describe('delete', () => {
    it('should delete the file', async () => {
      const store = createStore();
      await store.write({ name: 'to-delete', count: 0, items: [] });
      expect(existsSync(store.getPath())).toBe(true);

      await store.delete();
      expect(existsSync(store.getPath())).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      const store = createStore('nonexistent.json');
      await expect(store.delete()).resolves.not.toThrow();
    });
  });

  // ─── getPath ─────────────────────────────────────────────────────
  describe('getPath', () => {
    it('should return the full path to the store file', () => {
      const store = createStore('my-store.json');
      expect(store.getPath()).toBe(join(TEST_HOME, '.omocs', 'my-store.json'));
    });
  });
});
