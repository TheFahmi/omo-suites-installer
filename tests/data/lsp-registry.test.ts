import { describe, it, expect } from 'vitest';
import {
  lspServers,
  getLspServer,
  listLspKeys,
  type LspServer,
} from '../../src/data/lsp-registry.ts';

describe('data/lsp-registry', () => {
  // ─── lspServers record ──────────────────────────────────────────
  describe('lspServers record', () => {
    it('should have at least 8 LSP servers', () => {
      expect(Object.keys(lspServers).length).toBeGreaterThanOrEqual(8);
    });

    it('every server should have required fields', () => {
      for (const [key, server] of Object.entries(lspServers)) {
        expect(server.name).toBeTruthy();
        expect(server.command).toBeTruthy();
        expect(Array.isArray(server.args)).toBe(true);
        expect(server.install).toBeTruthy();
        expect(Array.isArray(server.detect)).toBe(true);
        expect(server.detect.length).toBeGreaterThan(0);
        expect(server.description).toBeTruthy();
      }
    });

    it('should include common LSP servers', () => {
      expect(lspServers['typescript']).toBeDefined();
      expect(lspServers['css']).toBeDefined();
      expect(lspServers['html']).toBeDefined();
      expect(lspServers['json']).toBeDefined();
      expect(lspServers['yaml']).toBeDefined();
    });

    it('all servers should have --stdio in args', () => {
      for (const server of Object.values(lspServers)) {
        // Most LSP servers use --stdio but sql uses different args
        if (server.name !== 'SQL' && server.name !== 'Markdown') {
          expect(server.args).toContain('--stdio');
        }
      }
    });
  });

  // ─── getLspServer ───────────────────────────────────────────────
  describe('getLspServer', () => {
    it('should return a server by key', () => {
      const server = getLspServer('typescript');
      expect(server).toBeDefined();
      expect(server!.name).toBe('TypeScript');
      expect(server!.command).toBe('typescript-language-server');
    });

    it('should return undefined for unknown key', () => {
      expect(getLspServer('nonexistent')).toBeUndefined();
    });

    it('should return correct detect files for typescript', () => {
      const server = getLspServer('typescript')!;
      expect(server.detect).toContain('package.json');
      expect(server.detect).toContain('tsconfig.json');
    });

    it('should return correct data for tailwindcss', () => {
      const server = getLspServer('tailwindcss');
      expect(server).toBeDefined();
      expect(server!.name).toBe('Tailwind CSS');
    });

    it('should return correct data for prisma', () => {
      const server = getLspServer('prisma');
      expect(server).toBeDefined();
      expect(server!.detect).toContain('prisma/schema.prisma');
    });
  });

  // ─── listLspKeys ───────────────────────────────────────────────
  describe('listLspKeys', () => {
    it('should return all server keys', () => {
      const keys = listLspKeys();
      expect(keys.length).toBeGreaterThanOrEqual(8);
      expect(keys).toContain('typescript');
      expect(keys).toContain('css');
      expect(keys).toContain('yaml');
    });

    it('should match Object.keys(lspServers)', () => {
      expect(listLspKeys()).toEqual(Object.keys(lspServers));
    });
  });
});
