import { join } from 'path';

export interface AgentRole {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPromptFile: string;
  preferredModel: string;
  tools: string[];
  tags: string[];
}

// Resolve agents directory relative to project root
function getAgentsDir(): string {
  return join(import.meta.dir, '..', '..', 'agents');
}

export const agents: Record<string, AgentRole> = {
  atlas: {
    id: 'atlas',
    name: 'Atlas',
    emoji: '🗺️',
    description: 'Orchestrator — Breaks tasks into subtasks, delegates to specialists',
    systemPromptFile: 'atlas.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'write', 'execute', 'search', 'delegate'],
    tags: ['orchestration', 'planning', 'delegation'],
  },
  sisyphus: {
    id: 'sisyphus',
    name: 'Sisyphus',
    emoji: '🔨',
    description: 'Implementation — Writes code, follows patterns, tests relentlessly',
    systemPromptFile: 'sisyphus.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'write', 'execute', 'test', 'lint', 'format'],
    tags: ['coding', 'implementation', 'testing'],
  },
  prometheus: {
    id: 'prometheus',
    name: 'Prometheus',
    emoji: '🔥',
    description: 'Planner — Asks questions, creates bulletproof work plans',
    systemPromptFile: 'prometheus.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'search', 'analyze'],
    tags: ['planning', 'architecture', 'requirements'],
  },
  metis: {
    id: 'metis',
    name: 'Metis',
    emoji: '🧠',
    description: 'Gap Analysis — Finds hidden requirements, edge cases',
    systemPromptFile: 'metis.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'search', 'analyze'],
    tags: ['analysis', 'edge-cases', 'requirements'],
  },
  momus: {
    id: 'momus',
    name: 'Momus',
    emoji: '👁️',
    description: 'Code Reviewer — Merciless review, finds every flaw',
    systemPromptFile: 'momus.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'search', 'analyze', 'lint'],
    tags: ['review', 'quality', 'standards'],
  },
  hephaestus: {
    id: 'hephaestus',
    name: 'Hephaestus',
    emoji: '⚒️',
    description: 'Deep Worker — Complex refactoring, heavy lifting',
    systemPromptFile: 'hephaestus.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'write', 'execute', 'refactor', 'test'],
    tags: ['refactoring', 'deep-work', 'complex'],
  },
  oracle: {
    id: 'oracle',
    name: 'Oracle',
    emoji: '🔮',
    description: 'Advisor — Architecture decisions, technology choices',
    systemPromptFile: 'oracle.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'search', 'analyze'],
    tags: ['architecture', 'decisions', 'advisory'],
  },
  librarian: {
    id: 'librarian',
    name: 'Librarian',
    emoji: '📚',
    description: 'Search — Finds docs, examples, references',
    systemPromptFile: 'librarian.md',
    preferredModel: 'gemini-2.5-flash',
    tools: ['read', 'search', 'web-search'],
    tags: ['search', 'documentation', 'references'],
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🧭',
    description: 'Discovery — Explores codebase, maps structure',
    systemPromptFile: 'explorer.md',
    preferredModel: 'gemini-2.5-flash',
    tools: ['read', 'search', 'analyze', 'tree'],
    tags: ['exploration', 'mapping', 'discovery'],
  },
  'security-auditor': {
    id: 'security-auditor',
    name: 'Security Auditor',
    emoji: '🛡️',
    description: 'Security review — OWASP, injection, authentication',
    systemPromptFile: 'security-auditor.md',
    preferredModel: 'claude-4-opus',
    tools: ['read', 'search', 'analyze', 'scan'],
    tags: ['security', 'audit', 'owasp'],
  },
  'performance-profiler': {
    id: 'performance-profiler',
    name: 'Performance Profiler',
    emoji: '⚡',
    description: 'Performance — Bottlenecks, optimization, profiling',
    systemPromptFile: 'performance-profiler.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'execute', 'analyze', 'profile'],
    tags: ['performance', 'optimization', 'profiling'],
  },
  'database-expert': {
    id: 'database-expert',
    name: 'Database Expert',
    emoji: '🗃️',
    description: 'Database — Queries, migrations, indexes, optimization',
    systemPromptFile: 'database-expert.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'write', 'execute', 'sql'],
    tags: ['database', 'sql', 'migrations'],
  },
  'frontend-specialist': {
    id: 'frontend-specialist',
    name: 'Frontend Specialist',
    emoji: '🎨',
    description: 'Frontend — UI/UX, accessibility, responsive design',
    systemPromptFile: 'frontend-specialist.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'write', 'execute', 'browser', 'test'],
    tags: ['frontend', 'ui', 'ux', 'accessibility'],
  },
  'devops-engineer': {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    emoji: '🚀',
    description: 'DevOps — Docker, CI/CD, deployment, infrastructure',
    systemPromptFile: 'devops-engineer.md',
    preferredModel: 'claude-4-sonnet',
    tools: ['read', 'write', 'execute', 'docker', 'deploy'],
    tags: ['devops', 'docker', 'cicd', 'deployment'],
  },
};

export function getAgent(id: string): AgentRole | undefined {
  return agents[id];
}

export function listAgentIds(): string[] {
  return Object.keys(agents);
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
