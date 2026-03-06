export interface Profile {
  name: string;
  description: string;
  agents: {
    coder: string;
    task: string;
    title: string;
  };
  settings: {
    autoCompact: boolean;
    [key: string]: unknown;
  };
}

export const profiles: Record<string, Profile> = {
  power: {
    name: 'Power',
    description: 'Maximum capability — Claude Opus + GPT-5.3 Codex for review',
    agents: {
      coder: 'cliproxy/claude-opus-4-6-thinking',
      task: 'cliproxy/claude-opus-4-6-thinking',
      title: 'cliproxy/gpt-5.3-codex',
    },
    settings: { autoCompact: true },
  },
  balanced: {
    name: 'Balanced',
    description: 'Good performance — Claude Opus primary, Sonnet for cheap tasks',
    agents: {
      coder: 'cliproxy/claude-opus-4-6-thinking',
      task: 'cliproxy/claude-sonnet-4-6',
      title: 'cliproxy/claude-sonnet-4-6',
    },
    settings: { autoCompact: true },
  },
  economy: {
    name: 'Economy',
    description: 'Token-saving — Claude Sonnet for everything',
    agents: {
      coder: 'cliproxy/claude-sonnet-4-6',
      task: 'cliproxy/claude-sonnet-4-6',
      title: 'cliproxy/claude-sonnet-4-6',
    },
    settings: { autoCompact: true },
  },
  gemini: {
    name: 'Gemini Pro',
    description: 'Google Gemini 3.1 Pro High for heavy reasoning',
    agents: {
      coder: 'cliproxy/gemini-3.1-pro-high',
      task: 'cliproxy/gemini-3.1-pro-high',
      title: 'cliproxy/gemini-3.1-pro-high',
    },
    settings: { autoCompact: true },
  },
  hybrid: {
    name: 'Hybrid',
    description: 'Smart routing — Opus for heavy, Gemini for frontend, Sonnet for quick',
    agents: {
      coder: 'cliproxy/claude-opus-4-6-thinking',
      task: 'cliproxy/gemini-3.1-pro-high',
      title: 'cliproxy/claude-sonnet-4-6',
    },
    settings: { autoCompact: true },
  },
  local: {
    name: 'Local/Free',
    description: 'Free tier — Ollama DeepSeek Coder V3',
    agents: {
      coder: 'ollama/deepseek-coder-v3',
      task: 'ollama/deepseek-coder-v3',
      title: 'ollama/deepseek-coder-v3',
    },
    settings: { autoCompact: true },
  },
};

export function getProfile(key: string): Profile | undefined {
  return profiles[key];
}

export function listProfileKeys(): string[] {
  return Object.keys(profiles);
}
