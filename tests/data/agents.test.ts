import { describe, it, expect } from 'vitest';
import {
  agents,
  getAgent,
  listAgentIds,
  categoryRouting,
  getAgentForCategory,
  listCategories,
  type AgentRole,
} from '../../src/data/agents.ts';

describe('data/agents', () => {
  // ─── agents record ──────────────────────────────────────────────
  describe('agents record', () => {
    it('should have at least 15 agents', () => {
      expect(Object.keys(agents).length).toBeGreaterThanOrEqual(15);
    });

    it('every agent should have required fields', () => {
      for (const [id, agent] of Object.entries(agents)) {
        expect(agent.id).toBe(id);
        expect(agent.name).toBeTruthy();
        expect(agent.emoji).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.systemPromptFile).toBeTruthy();
        expect(agent.preferredModel).toBeTruthy();
        expect(typeof agent.thinkingBudget).toBe('number');
        expect(agent.thinkingBudget).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(agent.tools)).toBe(true);
        expect(agent.tools.length).toBeGreaterThan(0);
        expect(Array.isArray(agent.tags)).toBe(true);
        expect(agent.tags.length).toBeGreaterThan(0);
      }
    });

    it('should have unique IDs', () => {
      const ids = Object.keys(agents);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should include core agents', () => {
      const coreAgents = [
        'sisyphus', 'atlas', 'prometheus', 'metis', 'momus',
        'oracle', 'hephaestus', 'librarian', 'explore',
      ];
      for (const id of coreAgents) {
        expect(agents[id]).toBeDefined();
      }
    });

    it('should include agency agents', () => {
      const agencyAgents = [
        'agency-security-engineer',
        'agency-devops-automator',
        'agency-mobile-app-builder',
        'agency-ai-engineer',
        'agency-rapid-prototyper',
      ];
      for (const id of agencyAgents) {
        expect(agents[id]).toBeDefined();
      }
    });
  });

  // ─── getAgent ───────────────────────────────────────────────────
  describe('getAgent', () => {
    it('should return an agent by ID', () => {
      const agent = getAgent('sisyphus');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('Sisyphus');
      expect(agent!.emoji).toBe('🔨');
    });

    it('should return undefined for unknown ID', () => {
      expect(getAgent('nonexistent')).toBeUndefined();
    });

    it('should return correct agent data for atlas', () => {
      const agent = getAgent('atlas');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('Atlas');
      expect(agent!.tags).toContain('orchestration');
    });
  });

  // ─── listAgentIds ───────────────────────────────────────────────
  describe('listAgentIds', () => {
    it('should return all agent IDs', () => {
      const ids = listAgentIds();
      expect(ids.length).toBeGreaterThanOrEqual(15);
      expect(ids).toContain('sisyphus');
      expect(ids).toContain('atlas');
      expect(ids).toContain('momus');
    });

    it('should match Object.keys(agents)', () => {
      expect(listAgentIds()).toEqual(Object.keys(agents));
    });
  });

  // ─── categoryRouting ────────────────────────────────────────────
  describe('categoryRouting', () => {
    it('should have routing entries', () => {
      expect(Object.keys(categoryRouting).length).toBeGreaterThan(20);
    });

    it('should route deep tasks to sisyphus', () => {
      expect(categoryRouting['deep']).toBe('sisyphus');
      expect(categoryRouting['ultrabrain']).toBe('sisyphus');
      expect(categoryRouting['debugging']).toBe('sisyphus');
    });

    it('should route visual tasks to frontend-ui-ux-engineer', () => {
      expect(categoryRouting['visual-engineering']).toBe('frontend-ui-ux-engineer');
      expect(categoryRouting['artistry']).toBe('frontend-ui-ux-engineer');
    });

    it('should route code-review to momus', () => {
      expect(categoryRouting['code-review']).toBe('momus');
      expect(categoryRouting['spec-review']).toBe('momus');
    });

    it('should route database to database-expert', () => {
      expect(categoryRouting['database']).toBe('database-expert');
    });

    it('every routed agent should exist in agents record', () => {
      for (const agentId of Object.values(categoryRouting)) {
        expect(agents[agentId]).toBeDefined();
      }
    });
  });

  // ─── getAgentForCategory ────────────────────────────────────────
  describe('getAgentForCategory', () => {
    it('should return agent for known category', () => {
      const agent = getAgentForCategory('deep');
      expect(agent).toBeDefined();
      expect(agent!.id).toBe('sisyphus');
    });

    it('should return undefined for unknown category', () => {
      expect(getAgentForCategory('nonexistent-category')).toBeUndefined();
    });

    it('should return correct agent for security', () => {
      const agent = getAgentForCategory('security');
      expect(agent).toBeDefined();
      expect(agent!.id).toBe('agency-security-engineer');
    });
  });

  // ─── listCategories ─────────────────────────────────────────────
  describe('listCategories', () => {
    it('should return all category names', () => {
      const categories = listCategories();
      expect(categories.length).toBeGreaterThan(20);
      expect(categories).toContain('deep');
      expect(categories).toContain('code-review');
      expect(categories).toContain('database');
    });
  });

  // ─── Specific agent checks ─────────────────────────────────────
  describe('specific agents', () => {
    it('sisyphus should have coding-related tools', () => {
      const agent = getAgent('sisyphus')!;
      expect(agent.tools).toContain('write');
      expect(agent.tools).toContain('test');
    });

    it('librarian should have search tool', () => {
      const agent = getAgent('librarian')!;
      expect(agent.tools).toContain('search');
    });

    it('image-generator should have zero thinking budget', () => {
      const agent = getAgent('image-generator')!;
      expect(agent.thinkingBudget).toBe(0);
    });

    it('architect should have high thinking budget', () => {
      const agent = getAgent('architect')!;
      expect(agent.thinkingBudget).toBeGreaterThanOrEqual(32768);
    });
  });
});
