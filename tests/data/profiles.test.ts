import { describe, it, expect } from 'vitest';
import { profiles, profilesList, getProfile, listProfileKeys, type Profile } from '../../src/data/profiles.ts';

describe('data/profiles', () => {
  // ─── profilesList ────────────────────────────────────────────────
  describe('profilesList', () => {
    it('should have 13 profiles', () => {
      expect(profilesList).toHaveLength(13);
    });

    it('should have unique names', () => {
      const names = profilesList.map(p => p.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it('every profile should have required fields', () => {
      for (const p of profilesList) {
        expect(p.name).toBeTruthy();
        expect(p.scope).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.models).toBeDefined();
        expect(p.models.primary).toBeTruthy();
        expect(p.agentOverrides).toBeDefined();
        expect(p.categoryOverrides).toBeDefined();
        expect(p.agents).toBeDefined();
        expect(p.agents.coder).toBeTruthy();
        expect(p.agents.task).toBeTruthy();
        expect(p.agents.title).toBeTruthy();
        expect(p.settings).toBeDefined();
        expect(typeof p.settings.autoCompact).toBe('boolean');
      }
    });

    it('should have valid scope values', () => {
      const validScopes = ['mixed', 'all', 'lead', 'economy'];
      for (const p of profilesList) {
        expect(validScopes).toContain(p.scope);
      }
    });
  });

  // ─── profiles record ────────────────────────────────────────────
  describe('profiles record', () => {
    it('should be a Record<string, Profile> matching profilesList', () => {
      expect(Object.keys(profiles)).toHaveLength(profilesList.length);
      for (const p of profilesList) {
        expect(profiles[p.name]).toBe(p);
      }
    });
  });

  // ─── getProfile ──────────────────────────────────────────────────
  describe('getProfile', () => {
    it('should return a profile by name', () => {
      const p = getProfile('opus-4.6-all');
      expect(p).toBeDefined();
      expect(p!.name).toBe('opus-4.6-all');
      expect(p!.scope).toBe('all');
    });

    it('should return undefined for unknown profile', () => {
      expect(getProfile('nonexistent')).toBeUndefined();
    });

    it('should find all expected profile names', () => {
      const expected = [
        'opus-4.6-all', 'opus-4.6-lead', 'codex-5.3-all', 'codex-5.3-hybrid',
        'codex-5.3-gemini', 'codex-5.3-sonnet', 'gemini-3-all', 'sonnet-4.6-all',
        'sonnet-4.6-lead', 'kimi-k2.5-all', 'ultra-mixed', 'budget-mixed', 'local-free',
      ];
      for (const name of expected) {
        expect(getProfile(name)).toBeDefined();
      }
    });
  });

  // ─── listProfileKeys ────────────────────────────────────────────
  describe('listProfileKeys', () => {
    it('should return all profile names', () => {
      const keys = listProfileKeys();
      expect(keys).toHaveLength(13);
      expect(keys).toContain('opus-4.6-all');
      expect(keys).toContain('local-free');
      expect(keys).toContain('ultra-mixed');
    });
  });

  // ─── Specific profile checks ────────────────────────────────────
  describe('specific profiles', () => {
    it('opus-4.6-all should use only Opus model', () => {
      const p = getProfile('opus-4.6-all')!;
      expect(p.models.primary).toBe('anthropic/claude-opus-4-6');
      // All agent overrides should be opus
      for (const override of Object.values(p.agentOverrides)) {
        expect(override.model).toBe('anthropic/claude-opus-4-6');
      }
    });

    it('local-free should use ollama model', () => {
      const p = getProfile('local-free')!;
      expect(p.models.primary).toBe('ollama/deepseek-coder-v3');
      expect(p.scope).toBe('economy');
    });

    it('ultra-mixed should have multiple different models', () => {
      const p = getProfile('ultra-mixed')!;
      const models = new Set(Object.values(p.agentOverrides).map(o => o.model));
      expect(models.size).toBeGreaterThan(3);
    });

    it('budget-mixed should be economy scope', () => {
      const p = getProfile('budget-mixed')!;
      expect(p.scope).toBe('economy');
    });
  });
});
