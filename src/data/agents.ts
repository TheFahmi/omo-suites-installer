import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

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
  const __dirname = typeof import.meta.dirname === 'string' ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '..', '..', 'agents');
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
  // ── Agency Agents (from github.com/msitarzewski/agency-agents) ──
  'agency-security-engineer': {
    id: 'agency-security-engineer',
    name: 'Security Engineer',
    emoji: '🔒',
    description: 'Security — Threat modeling, secure code review, OWASP, vulnerability assessment',
    systemPromptFile: 'agency-security-engineer.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 32768,
    tools: ['read', 'write', 'execute', 'search', 'analyze'],
    tags: ['security', 'threat-modeling', 'owasp', 'vulnerability'],
  },
  'agency-devops-automator': {
    id: 'agency-devops-automator',
    name: 'DevOps Automator',
    emoji: '🚀',
    description: 'DevOps — CI/CD pipelines, infrastructure automation, Docker, cloud ops',
    systemPromptFile: 'agency-devops-automator.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 20480,
    tools: ['read', 'write', 'execute', 'deploy'],
    tags: ['devops', 'cicd', 'docker', 'infrastructure'],
  },
  'agency-mobile-app-builder': {
    id: 'agency-mobile-app-builder',
    name: 'Mobile App Builder',
    emoji: '📱',
    description: 'Mobile — iOS/Android, React Native, Flutter, cross-platform apps',
    systemPromptFile: 'agency-mobile-app-builder.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 20480,
    tools: ['read', 'write', 'execute', 'test'],
    tags: ['mobile', 'ios', 'android', 'react-native', 'flutter'],
  },
  'agency-ai-engineer': {
    id: 'agency-ai-engineer',
    name: 'AI Engineer',
    emoji: '🤖',
    description: 'AI/ML — Models, deployment, data pipelines, AI integration',
    systemPromptFile: 'agency-ai-engineer.md',
    preferredModel: 'cliproxy/claude-opus-4-6-thinking',
    thinkingBudget: 32768,
    tools: ['read', 'write', 'execute', 'analyze'],
    tags: ['ai', 'ml', 'data-science', 'models'],
  },
  'agency-rapid-prototyper': {
    id: 'agency-rapid-prototyper',
    name: 'Rapid Prototyper',
    emoji: '⚡',
    description: 'Prototyping — Fast POCs, MVPs, hackathon projects, quick iteration',
    systemPromptFile: 'agency-rapid-prototyper.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 10240,
    tools: ['read', 'write', 'execute', 'test'],
    tags: ['prototype', 'mvp', 'hackathon', 'rapid'],
  },
  'agency-accessibility-auditor': {
    id: 'agency-accessibility-auditor',
    name: 'Accessibility Auditor',
    emoji: '♿',
    description: 'Accessibility — WCAG compliance, screen reader testing, a11y audit',
    systemPromptFile: 'agency-accessibility-auditor.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 16384,
    tools: ['read', 'search', 'analyze', 'test'],
    tags: ['accessibility', 'wcag', 'a11y', 'audit'],
  },
  'agency-performance-benchmarker': {
    id: 'agency-performance-benchmarker',
    name: 'Performance Benchmarker',
    emoji: '📊',
    description: 'Performance — Benchmarking, profiling, Core Web Vitals, optimization',
    systemPromptFile: 'agency-performance-benchmarker.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 16384,
    tools: ['read', 'execute', 'analyze', 'test'],
    tags: ['performance', 'benchmark', 'profiling', 'optimization'],
  },
  'agency-api-tester': {
    id: 'agency-api-tester',
    name: 'API Tester',
    emoji: '🧪',
    description: 'API Testing — Endpoint testing, integration tests, contract testing',
    systemPromptFile: 'agency-api-tester.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 16384,
    tools: ['read', 'write', 'execute', 'test'],
    tags: ['api', 'testing', 'integration', 'contract'],
  },
  'agency-ux-researcher': {
    id: 'agency-ux-researcher',
    name: 'UX Researcher',
    emoji: '🔍',
    description: 'UX Research — User testing, behavior analysis, usability insights',
    systemPromptFile: 'agency-ux-researcher.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 16384,
    tools: ['read', 'search', 'analyze'],
    tags: ['ux', 'research', 'usability', 'user-testing'],
  },
  'agency-brand-guardian': {
    id: 'agency-brand-guardian',
    name: 'Brand Guardian',
    emoji: '🎭',
    description: 'Brand — Voice consistency, style guides, brand identity',
    systemPromptFile: 'agency-brand-guardian.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 10240,
    tools: ['read', 'search', 'analyze'],
    tags: ['brand', 'identity', 'style', 'voice'],
  },
  'agency-content-creator': {
    id: 'agency-content-creator',
    name: 'Content Creator',
    emoji: '✍️',
    description: 'Content — Blog posts, copy, social media, marketing content',
    systemPromptFile: 'agency-content-creator.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 10240,
    tools: ['read', 'write', 'search'],
    tags: ['content', 'writing', 'marketing', 'copywriting'],
  },
  'agency-growth-hacker': {
    id: 'agency-growth-hacker',
    name: 'Growth Hacker',
    emoji: '📈',
    description: 'Growth — User acquisition, retention, funnel optimization, analytics',
    systemPromptFile: 'agency-growth-hacker.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 16384,
    tools: ['read', 'search', 'analyze'],
    tags: ['growth', 'marketing', 'analytics', 'acquisition'],
  },
  'agency-project-shepherd': {
    id: 'agency-project-shepherd',
    name: 'Project Shepherd',
    emoji: '🐑',
    description: 'Project Management — Sprint planning, stakeholder updates, risk management',
    systemPromptFile: 'agency-project-shepherd.md',
    preferredModel: 'cliproxy/claude-sonnet-4-6',
    thinkingBudget: 10240,
    tools: ['read', 'write', 'search'],
    tags: ['project-management', 'sprint', 'planning', 'risk'],
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
  'security': 'agency-security-engineer',
  'performance': 'agency-performance-benchmarker',
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
  // Agency agent categories
  'devops': 'agency-devops-automator',
  'cicd': 'agency-devops-automator',
  'infrastructure': 'agency-devops-automator',
  'docker': 'agency-devops-automator',
  'mobile': 'agency-mobile-app-builder',
  'ios': 'agency-mobile-app-builder',
  'android': 'agency-mobile-app-builder',
  'react-native': 'agency-mobile-app-builder',
  'flutter': 'agency-mobile-app-builder',
  'ai': 'agency-ai-engineer',
  'ml': 'agency-ai-engineer',
  'machine-learning': 'agency-ai-engineer',
  'data-science': 'agency-ai-engineer',
  'prototype': 'agency-rapid-prototyper',
  'mvp': 'agency-rapid-prototyper',
  'hackathon': 'agency-rapid-prototyper',
  'a11y': 'agency-accessibility-auditor',
  'wcag': 'agency-accessibility-auditor',
  'api-testing': 'agency-api-tester',
  'contract-testing': 'agency-api-tester',
  'ux-research': 'agency-ux-researcher',
  'user-testing': 'agency-ux-researcher',
  'usability': 'agency-ux-researcher',
  'brand': 'agency-brand-guardian',
  'style-guide': 'agency-brand-guardian',
  'content': 'agency-content-creator',
  'copywriting': 'agency-content-creator',
  'blog': 'agency-content-creator',
  'growth': 'agency-growth-hacker',
  'marketing': 'agency-growth-hacker',
  'user-acquisition': 'agency-growth-hacker',
  'project-management': 'agency-project-shepherd',
  'sprint': 'agency-project-shepherd',
  'stakeholder': 'agency-project-shepherd',
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
    return readFileSync(path, 'utf-8');
  } catch {
    return `System prompt for ${agent.name} — ${agent.description}`;
  }
}
