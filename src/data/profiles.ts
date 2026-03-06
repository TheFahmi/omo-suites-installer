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
    description: 'Maximum capability — Claude Opus + GPT-4.1',
    agents: {
      coder: 'claude-4-opus',
      task: 'claude-4-opus',
      title: 'claude-3.5-haiku',
    },
    settings: { autoCompact: true },
  },
  balanced: {
    name: 'Balanced',
    description: 'Good performance — Claude Sonnet',
    agents: {
      coder: 'claude-4-sonnet',
      task: 'claude-4-sonnet',
      title: 'claude-3.5-haiku',
    },
    settings: { autoCompact: true },
  },
  economy: {
    name: 'Economy',
    description: 'Token-saving — Gemini Flash + Haiku',
    agents: {
      coder: 'gemini-2.5-flash',
      task: 'gemini-2.5-flash',
      title: 'claude-3.5-haiku',
    },
    settings: { autoCompact: true },
  },
  gemini: {
    name: 'Gemini Pro',
    description: 'Google Gemini 2.5 Pro for heavy reasoning',
    agents: {
      coder: 'gemini-2.5',
      task: 'gemini-2.5',
      title: 'gemini-2.0-flash',
    },
    settings: { autoCompact: true },
  },
  hybrid: {
    name: 'Hybrid',
    description: 'Smart routing — premium for coding, cheap for tasks',
    agents: {
      coder: 'claude-4-sonnet',
      task: 'gemini-2.5-flash',
      title: 'claude-3.5-haiku',
    },
    settings: { autoCompact: true },
  },
  local: {
    name: 'Local/Free',
    description: 'Free tier — Copilot + Groq',
    agents: {
      coder: 'copilot:claude-sonnet-4',
      task: 'copilot:gpt-4o',
      title: 'copilot:gpt-4o-mini',
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
