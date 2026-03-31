import { describe, it, expect } from 'vitest';
import {
  mcpServers,
  getMcpServer,
  listMcpKeys,
  type McpServer,
} from '../../src/data/mcp-registry.ts';

describe('data/mcp-registry', () => {
  // ─── mcpServers record ──────────────────────────────────────────
  describe('mcpServers record', () => {
    it('should have at least 10 MCP servers', () => {
      expect(Object.keys(mcpServers).length).toBeGreaterThanOrEqual(10);
    });

    it('every server should have required fields', () => {
      for (const [key, server] of Object.entries(mcpServers)) {
        expect(server.name).toBeTruthy();
        expect(server.description).toBeTruthy();
        expect(server.type).toBe('stdio');
        expect(server.command).toBeTruthy();
        expect(Array.isArray(server.args)).toBe(true);
        expect(Array.isArray(server.tags)).toBe(true);
        expect(server.tags.length).toBeGreaterThan(0);
      }
    });

    it('should include well-known servers', () => {
      expect(mcpServers['postgres']).toBeDefined();
      expect(mcpServers['fetch']).toBeDefined();
      expect(mcpServers['filesystem']).toBeDefined();
      expect(mcpServers['docker']).toBeDefined();
    });

    it('servers with env should have Record<string, string> env', () => {
      for (const server of Object.values(mcpServers)) {
        if (server.env) {
          expect(typeof server.env).toBe('object');
          for (const [k, v] of Object.entries(server.env)) {
            expect(typeof k).toBe('string');
            expect(typeof v).toBe('string');
          }
        }
      }
    });
  });

  // ─── getMcpServer ───────────────────────────────────────────────
  describe('getMcpServer', () => {
    it('should return a server by key', () => {
      const server = getMcpServer('postgres');
      expect(server).toBeDefined();
      expect(server!.name).toBe('PostgreSQL');
      expect(server!.tags).toContain('database');
    });

    it('should return undefined for unknown key', () => {
      expect(getMcpServer('nonexistent')).toBeUndefined();
    });

    it('should return correct data for fetch server', () => {
      const server = getMcpServer('fetch');
      expect(server).toBeDefined();
      expect(server!.command).toBe('npx');
      expect(server!.tags).toContain('web');
    });

    it('should return correct data for context7', () => {
      const server = getMcpServer('context7');
      expect(server).toBeDefined();
      expect(server!.tags).toContain('documentation');
    });
  });

  // ─── listMcpKeys ───────────────────────────────────────────────
  describe('listMcpKeys', () => {
    it('should return all server keys', () => {
      const keys = listMcpKeys();
      expect(keys.length).toBeGreaterThanOrEqual(10);
      expect(keys).toContain('postgres');
      expect(keys).toContain('fetch');
      expect(keys).toContain('redis');
    });

    it('should match Object.keys(mcpServers)', () => {
      expect(listMcpKeys()).toEqual(Object.keys(mcpServers));
    });
  });
});
