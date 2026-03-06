import { join } from 'path';

export interface AgentRole {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPromptFile: string;
  preferredModel: string;
  thinkingBudget: number;
  tools: string[];
  tags: string[];
}

// Resolve agents directory relative to project root
function getAgentsDir(): string {
  return join(import.meta.dir, '..', '..', 'agents');
}

export const agents: Record<string, AgentRole> = {
  sisyphus: {
    id: 'sisyphus',
    name: 'Sisyphus',
    emoji: '🔨',
    description: 'Implementation — Writes code, follows patterns, tests relentlessly',
    systemPromptFile: 'sisyphus.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 16384,
    tools: ['read', 'write', 'execute', 'test', 'lint', 'format'],
    tags: ['coding', 'implementation', 'testing'],
  },
  atlas: {
    id: 'atlas',
    name: 'Atlas',
    emoji: '🗺️',
    description: 'Orchestrator — Breaks tasks into subtasks, delegates to specialists',
    systemPromptFile: 'atlas.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 20480,
    tools: ['read', 'write', 'execute', 'search', 'delegate'],
    tags: ['orchestration', 'planning', 'delegation'],
  },
  prometheus: {
    id: 'prometheus',
    name: 'Prometheus',
    emoji: '🔥',
    description: 'Planner — Asks questions, creates bulletproof work plans',
    systemPromptFile: 'prometheus.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 40960,
    tools: ['read', 'search', 'analyze'],
    tags: ['planning', 'architecture', 'requirements'],
  },
  metis: {
    id: 'metis',
    name: 'Metis',
    emoji: '🧠',
    description: 'Gap Analysis — Finds hidden requirements, edge cases',
    systemPromptFile: 'metis.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 32768,
    tools: ['read', 'search', 'analyze'],
    tags: ['analysis', 'edge-cases', 'requirements'],
  },
  momus: {
    id: 'momus',
    name: 'Momus',
    emoji: '👁️',
    description: 'Code Reviewer — Merciless review, finds every flaw',
    systemPromptFile: 'momus.md',
    preferredModel: 'cliproxy/gpt-5.3-codex',
    thinkingBudget: 40960,
    tools: ['read', 'search', 'analyze', 'lint'],
    tags: ['review', 'quality', 'standards'],
  },
  oracle: {
    id: 'oracle',
    name: 'Oracle',
    emoji: '🔮',
    description: 'Advisor — Architecture decisions, technology choices',
    systemPromptFile: 'oracle.md',
    preferredModel: 'cliproxy/gpt-5.3-codex',
    thinkingBudget: 32768,
    tools: ['read', 'search', 'analyze'],
    tags: ['architecture', 'decisions', 'advisory'],
  },
  hephaestus: {
    id: 'hephaestus',
    name: 'Hephaestus',
    emoji: '⚒️',
    description: 'Deep Worker — Complex refactoring, heavy lifting',
    systemPromptFile: 'hephaestus.md',
    preferredModel: 'cliproxy/gpt-5.3-codex',
    thinkingBudget: 51200,
    tools: ['read', 'write', 'execute', 'refactor', 'test'],
    tags: ['refactoring', 'deep-work', 'complex'],
  },
  librarian: {
    id: 'librarian',
    name: 'Librarian',
    emoji: '📚',
    description: 'Search — Finds docs, examples, references',
    systemPromptFile: 'librarian.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 8192,
    tools: ['read', 'search', 'web-search'],
    tags: ['search', 'documentation', 'references'],
  },
  explore: {
    id: 'explore',
    name: 'Explore',
    emoji: '🧭',
    description: 'Discovery — Explores codebase, maps structure',
    systemPromptFile: 'explore.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 10240,
    tools: ['read', 'search', 'analyze', 'tree'],
    tags: ['exploration', 'mapping', 'discovery'],
  },
  'multimodal-looker': {
    id: 'multimodal-looker',
    name: 'Multimodal Looker',
    emoji: '👀',
    description: 'Visual analysis — Screenshots, UI review, visual inspection',
    systemPromptFile: 'multimodal-looker.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 15360,
    tools: ['read', 'search', 'analyze', 'browser', 'screenshot'],
    tags: ['visual', 'multimodal', 'ui-review'],
  },
  'frontend-ui-ux-engineer': {
    id: 'frontend-ui-ux-engineer',
    name: 'Frontend UI/UX Engineer',
    emoji: '🎨',
    description: 'Frontend — UI/UX, accessibility, responsive design, visual engineering',
    systemPromptFile: 'frontend-ui-ux-engineer.md',
    preferredModel: 'cliproxy/gemini-3.1-pro-high',
    thinkingBudget: 20480,
    tools: ['read', 'write', 'execute', 'browser', 'test'],
    tags: ['frontend', 'ui', 'ux', 'accessibility', 'visual-engineering'],
  },
  architect: {
    id: 'architect',
    name: 'Architect',
    emoji: '🏗️',
    description: 'Architecture — System design, API design, technical strategy',
    systemPromptFile: 'architect.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 40960,
    tools: ['read', 'search', 'analyze', 'write'],
    tags: ['architecture', 'design', 'api', 'strategy'],
  },
  'database-expert': {
    id: 'database-expert',
    name: 'Database Expert',
    emoji: '🗃️',
    description: 'Database — Queries, migrations, indexes, optimization',
    systemPromptFile: 'database-expert.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 32768,
    tools: ['read', 'write', 'execute', 'sql'],
    tags: ['database', 'sql', 'migrations'],
  },
  devrel: {
    id: 'devrel',
    name: 'DevRel',
    emoji: '🚀',
    description: 'DevRel — Writing, documentation, community, deployment',
    systemPromptFile: 'devrel.md',
    preferredModel: 'cliproxy/kimi-k2.5-tee',
    thinkingBudget: 20480,
    tools: ['read', 'write', 'execute', 'deploy'],
    tags: ['devrel', 'writing', 'documentation', 'deployment'],
  },
  'image-generator': {
    id: 'image-generator',
    name: 'Image Generator',
    emoji: '🖼️',
    description: 'Image generation — Creates images from text descriptions',
    systemPromptFile: 'image-generator.md',
    preferredModel: 'cliproxy/glm-image',
    thinkingBudget: 0,
    tools: ['generate-image'],
    tags: ['image', 'generation', 'visual'],
  },
};

// Category → agent routing (oh-my-opencode v3.8.4)
export const categoryRouting: Record<string, string> = {
  'deep': 'sisyphus',
  'ultrabrain': 'sisyphus',
  'deep-reasoning': 'sisyphus',
  'unspecified-high': 'sisyphus',
  'backend': 'sisyphus',
  'debugging': 'sisyphus',
  'refactor': 'sisyphus',
  'testing': 'sisyphus',
  'deployment': 'sisyphus',
  'migration': 'sisyphus',
  'visual-engineering': 'frontend-ui-ux-engineer',
  'artistry': 'frontend-ui-ux-engineer',
  'accessibility': 'frontend-ui-ux-engineer',
  'i18n': 'frontend-ui-ux-engineer',
  'seo': 'frontend-ui-ux-engineer',
  'develop-web-game': 'frontend-ui-ux-engineer',
  'quick': 'librarian',
  'unspecified-low': 'librarian',
  'writing': 'devrel',
  'research': 'devrel',
  'security': 'hephaestus',
  'performance': 'hephaestus',
  'code-review': 'momus',
  'spec-review': 'momus',
  'api-design': 'architect',
  'architect': 'architect',
  'database': 'database-expert',
  'brainstorming': 'oracle',
  'business-analysis': 'oracle',
  'token-efficiency': 'metis',
  'introspection': 'metis',
  'image-generation': 'image-generator',
};

export function getAgent(id: string): AgentRole | undefined {
  return agents[id];
}

export function listAgentIds(): string[] {
  return Object.keys(agents);
}

export function getAgentForCategory(category: string): AgentRole | undefined {
  const agentId = categoryRouting[category];
  if (agentId) return agents[agentId];
  return undefined;
}

export function listCategories(): string[] {
  return Object.keys(categoryRouting);
}

export function getAgentPromptPath(agent: AgentRole): string {
  return join(getAgentsDir(), agent.systemPromptFile);
}

export async function loadAgentPrompt(agent: AgentRole): Promise<string> {
  const path = getAgentPromptPath(agent);
  try {
    const file = Bun.file(path);
    return await file.text();
  } catch {
    return `System prompt for ${agent.name} — ${agent.description}`;
  }
}
