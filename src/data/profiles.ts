// ─── Profile Types (v2 — Plugin-compatible) ─────────────────────────

export interface ProfileV1 {
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

export interface Profile {
  name: string;
  scope: "mixed" | "all" | "lead" | "economy";
  description: string;
  models: {
    primary: string;
    secondary?: string;
    review?: string;
    frontend?: string;
    research?: string;
  };
  agentOverrides: Record<string, { model: string }>;
  categoryOverrides: Record<string, { model: string }>;
  // Legacy compat — maps to OpenCode config agents block
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

// ─── All Agent IDs (for generating overrides) ────────────────────────
const LEAD_AGENTS = ["sisyphus", "atlas", "prometheus", "metis", "architect", "database-expert"];
const WORKER_AGENTS = ["momus", "oracle", "hephaestus"];
const SUPPORT_AGENTS = ["librarian", "explore", "multimodal-looker"];
const CREATIVE_AGENTS = ["frontend-ui-ux-engineer", "devrel", "image-generator"];
const ALL_AGENTS = [...LEAD_AGENTS, ...WORKER_AGENTS, ...SUPPORT_AGENTS, ...CREATIVE_AGENTS];

const ALL_CATEGORIES = [
  "deep", "ultrabrain", "deep-reasoning", "unspecified-high", "backend",
  "debugging", "refactor", "testing", "deployment", "migration",
  "visual-engineering", "artistry", "accessibility", "i18n", "seo", "develop-web-game",
  "quick", "unspecified-low", "writing", "research",
  "security", "performance", "code-review", "spec-review",
  "api-design", "architect", "database",
  "brainstorming", "business-analysis", "token-efficiency", "introspection",
  "image-generation",
];

// ─── Helper: generate "all" scope overrides ──────────────────────────
function allScope(model: string): Record<string, { model: string }> {
  const result: Record<string, { model: string }> = {};
  for (const agent of ALL_AGENTS) {
    result[agent] = { model };
  }
  return result;
}

function allCategoryScope(model: string): Record<string, { model: string }> {
  const result: Record<string, { model: string }> = {};
  for (const cat of ALL_CATEGORIES) {
    result[cat] = { model };
  }
  return result;
}

// ─── Helper: generate "lead" scope overrides ─────────────────────────
function leadScope(primary: string, secondary: string, frontend?: string): Record<string, { model: string }> {
  const result: Record<string, { model: string }> = {};
  for (const agent of LEAD_AGENTS) result[agent] = { model: primary };
  for (const agent of WORKER_AGENTS) result[agent] = { model: secondary };
  for (const agent of SUPPORT_AGENTS) result[agent] = { model: secondary };
  for (const agent of CREATIVE_AGENTS) {
    if (agent === "frontend-ui-ux-engineer" && frontend) {
      result[agent] = { model: frontend };
    } else {
      result[agent] = { model: secondary };
    }
  }
  return result;
}

// ─── 13 Profiles (OCS has 8 — we have 13) ────────────────────────────

export const profilesList: Profile[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. opus-4.6-all — Maximum quality
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "opus-4.6-all",
    scope: "all",
    description: "Pure Claude Opus 4.6 Thinking — maximum quality, all agents",
    models: { primary: "anthropic/claude-opus-4-6" },
    agentOverrides: allScope("anthropic/claude-opus-4-6"),
    categoryOverrides: allCategoryScope("anthropic/claude-opus-4-6"),
    agents: {
      coder: "anthropic/claude-opus-4-6",
      task: "anthropic/claude-opus-4-6",
      title: "anthropic/claude-opus-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. opus-4.6-lead — Opus leads, mixed workers
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "opus-4.6-lead",
    scope: "lead",
    description: "Opus 4.6 leads, mixed workers (Sonnet + Gemini + Codex)",
    models: {
      primary: "anthropic/claude-opus-4-6",
      secondary: "anthropic/claude-sonnet-4-6",
      frontend: "google/gemini-3.1-pro",
      review: "openai/gpt-5.3-codex",
    },
    agentOverrides: {
      ...leadScope("anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-6", "google/gemini-3.1-pro"),
      momus: { model: "openai/gpt-5.3-codex" },
      hephaestus: { model: "openai/gpt-5.3-codex" },
      oracle: { model: "openai/gpt-5.3-codex" },
    },
    categoryOverrides: {
      "visual-engineering": { model: "google/gemini-3.1-pro" },
      "artistry": { model: "google/gemini-3.1-pro" },
      "code-review": { model: "openai/gpt-5.3-codex" },
      "spec-review": { model: "openai/gpt-5.3-codex" },
      quick: { model: "anthropic/claude-sonnet-4-6" },
      "unspecified-low": { model: "anthropic/claude-sonnet-4-6" },
    },
    agents: {
      coder: "anthropic/claude-opus-4-6",
      task: "anthropic/claude-sonnet-4-6",
      title: "anthropic/claude-sonnet-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. codex-5.3-all — Pure OpenAI Codex
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "codex-5.3-all",
    scope: "all",
    description: "Pure GPT-5.3 Codex — OpenAI's best coding model",
    models: { primary: "openai/gpt-5.3-codex" },
    agentOverrides: allScope("openai/gpt-5.3-codex"),
    categoryOverrides: allCategoryScope("openai/gpt-5.3-codex"),
    agents: {
      coder: "openai/gpt-5.3-codex",
      task: "openai/gpt-5.3-codex",
      title: "openai/gpt-5.3-codex",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. codex-5.3-hybrid — Codex + Gemini + Flash + Sonnet
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "codex-5.3-hybrid",
    scope: "mixed",
    description: "Codex 5.3 + Gemini 3.1 Pro + Gemini 3 Flash + Sonnet 4.6",
    models: {
      primary: "openai/gpt-5.3-codex",
      frontend: "google/gemini-3.1-pro",
      research: "google/gemini-3-flash",
      secondary: "anthropic/claude-sonnet-4-6",
    },
    agentOverrides: {
      sisyphus: { model: "openai/gpt-5.3-codex" },
      atlas: { model: "openai/gpt-5.3-codex" },
      prometheus: { model: "openai/gpt-5.3-codex" },
      metis: { model: "anthropic/claude-sonnet-4-6" },
      momus: { model: "openai/gpt-5.3-codex" },
      oracle: { model: "openai/gpt-5.3-codex" },
      hephaestus: { model: "openai/gpt-5.3-codex" },
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "google/gemini-3-flash" },
      "multimodal-looker": { model: "google/gemini-3.1-pro" },
      "frontend-ui-ux-engineer": { model: "google/gemini-3.1-pro" },
      architect: { model: "openai/gpt-5.3-codex" },
      "database-expert": { model: "openai/gpt-5.3-codex" },
      devrel: { model: "anthropic/claude-sonnet-4-6" },
      "image-generator": { model: "openai/gpt-5.3-codex" },
    },
    categoryOverrides: {
      "visual-engineering": { model: "google/gemini-3.1-pro" },
      artistry: { model: "google/gemini-3.1-pro" },
      research: { model: "google/gemini-3-flash" },
      quick: { model: "anthropic/claude-sonnet-4-6" },
      "unspecified-low": { model: "google/gemini-3-flash" },
    },
    agents: {
      coder: "openai/gpt-5.3-codex",
      task: "google/gemini-3.1-pro",
      title: "anthropic/claude-sonnet-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. codex-5.3-gemini — Codex + Gemini duo
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "codex-5.3-gemini",
    scope: "mixed",
    description: "Codex 5.3 + Gemini 3.1 Pro + Gemini 3 Flash",
    models: {
      primary: "openai/gpt-5.3-codex",
      frontend: "google/gemini-3.1-pro",
      research: "google/gemini-3-flash",
    },
    agentOverrides: {
      sisyphus: { model: "openai/gpt-5.3-codex" },
      atlas: { model: "openai/gpt-5.3-codex" },
      prometheus: { model: "openai/gpt-5.3-codex" },
      metis: { model: "openai/gpt-5.3-codex" },
      momus: { model: "openai/gpt-5.3-codex" },
      oracle: { model: "openai/gpt-5.3-codex" },
      hephaestus: { model: "openai/gpt-5.3-codex" },
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "google/gemini-3-flash" },
      "multimodal-looker": { model: "google/gemini-3.1-pro" },
      "frontend-ui-ux-engineer": { model: "google/gemini-3.1-pro" },
      architect: { model: "openai/gpt-5.3-codex" },
      "database-expert": { model: "openai/gpt-5.3-codex" },
      devrel: { model: "google/gemini-3-flash" },
      "image-generator": { model: "google/gemini-3.1-pro" },
    },
    categoryOverrides: {
      "visual-engineering": { model: "google/gemini-3.1-pro" },
      artistry: { model: "google/gemini-3.1-pro" },
      research: { model: "google/gemini-3-flash" },
      writing: { model: "google/gemini-3-flash" },
      quick: { model: "google/gemini-3-flash" },
      "unspecified-low": { model: "google/gemini-3-flash" },
    },
    agents: {
      coder: "openai/gpt-5.3-codex",
      task: "google/gemini-3.1-pro",
      title: "google/gemini-3-flash",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. codex-5.3-sonnet — Codex + Sonnet duo
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "codex-5.3-sonnet",
    scope: "mixed",
    description: "Codex 5.3 + Sonnet 4.6 Thinking",
    models: {
      primary: "openai/gpt-5.3-codex",
      secondary: "anthropic/claude-sonnet-4-6",
    },
    agentOverrides: {
      sisyphus: { model: "openai/gpt-5.3-codex" },
      atlas: { model: "openai/gpt-5.3-codex" },
      prometheus: { model: "openai/gpt-5.3-codex" },
      metis: { model: "anthropic/claude-sonnet-4-6" },
      momus: { model: "openai/gpt-5.3-codex" },
      oracle: { model: "openai/gpt-5.3-codex" },
      hephaestus: { model: "openai/gpt-5.3-codex" },
      librarian: { model: "anthropic/claude-sonnet-4-6" },
      explore: { model: "anthropic/claude-sonnet-4-6" },
      "multimodal-looker": { model: "anthropic/claude-sonnet-4-6" },
      "frontend-ui-ux-engineer": { model: "anthropic/claude-sonnet-4-6" },
      architect: { model: "openai/gpt-5.3-codex" },
      "database-expert": { model: "openai/gpt-5.3-codex" },
      devrel: { model: "anthropic/claude-sonnet-4-6" },
      "image-generator": { model: "openai/gpt-5.3-codex" },
    },
    categoryOverrides: {
      quick: { model: "anthropic/claude-sonnet-4-6" },
      "unspecified-low": { model: "anthropic/claude-sonnet-4-6" },
      writing: { model: "anthropic/claude-sonnet-4-6" },
      research: { model: "anthropic/claude-sonnet-4-6" },
    },
    agents: {
      coder: "openai/gpt-5.3-codex",
      task: "anthropic/claude-sonnet-4-6",
      title: "anthropic/claude-sonnet-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. gemini-3-all — Pure Google
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "gemini-3-all",
    scope: "all",
    description: "Pure Gemini 3.1 Pro + Flash — Google's best",
    models: {
      primary: "google/gemini-3.1-pro",
      research: "google/gemini-3-flash",
    },
    agentOverrides: {
      ...allScope("google/gemini-3.1-pro"),
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "google/gemini-3-flash" },
      devrel: { model: "google/gemini-3-flash" },
    },
    categoryOverrides: {
      ...allCategoryScope("google/gemini-3.1-pro"),
      quick: { model: "google/gemini-3-flash" },
      "unspecified-low": { model: "google/gemini-3-flash" },
      research: { model: "google/gemini-3-flash" },
      writing: { model: "google/gemini-3-flash" },
    },
    agents: {
      coder: "google/gemini-3.1-pro",
      task: "google/gemini-3.1-pro",
      title: "google/gemini-3-flash",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. sonnet-4.6-all — Balanced Sonnet
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "sonnet-4.6-all",
    scope: "all",
    description: "Pure Sonnet 4.6 Thinking — balanced cost/quality",
    models: { primary: "anthropic/claude-sonnet-4-6" },
    agentOverrides: allScope("anthropic/claude-sonnet-4-6"),
    categoryOverrides: allCategoryScope("anthropic/claude-sonnet-4-6"),
    agents: {
      coder: "anthropic/claude-sonnet-4-6",
      task: "anthropic/claude-sonnet-4-6",
      title: "anthropic/claude-sonnet-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 9. sonnet-4.6-lead — Sonnet leads, Gemini workers
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "sonnet-4.6-lead",
    scope: "lead",
    description: "Sonnet 4.6 leads, Gemini + Flash workers",
    models: {
      primary: "anthropic/claude-sonnet-4-6",
      frontend: "google/gemini-3.1-pro",
      research: "google/gemini-3-flash",
    },
    agentOverrides: {
      ...leadScope("anthropic/claude-sonnet-4-6", "google/gemini-3-flash", "google/gemini-3.1-pro"),
    },
    categoryOverrides: {
      "visual-engineering": { model: "google/gemini-3.1-pro" },
      artistry: { model: "google/gemini-3.1-pro" },
      quick: { model: "google/gemini-3-flash" },
      "unspecified-low": { model: "google/gemini-3-flash" },
      research: { model: "google/gemini-3-flash" },
      writing: { model: "google/gemini-3-flash" },
    },
    agents: {
      coder: "anthropic/claude-sonnet-4-6",
      task: "google/gemini-3.1-pro",
      title: "google/gemini-3-flash",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 10. kimi-k2.5-all — OMO EXCLUSIVE (OCS doesn't have)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "kimi-k2.5-all",
    scope: "all",
    description: "Pure Kimi K2.5 — Claude-like behavior, ultra cheap",
    models: { primary: "kimi-for-coding/k2p5" },
    agentOverrides: allScope("kimi-for-coding/k2p5"),
    categoryOverrides: allCategoryScope("kimi-for-coding/k2p5"),
    agents: {
      coder: "kimi-for-coding/k2p5",
      task: "kimi-for-coding/k2p5",
      title: "kimi-for-coding/k2p5",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 11. ultra-mixed — OMO EXCLUSIVE — Best model per task
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "ultra-mixed",
    scope: "mixed",
    description: "Best model per task — Opus orchestrate, Codex deep work, Gemini frontend, Sonnet quick",
    models: {
      primary: "anthropic/claude-opus-4-6",
      review: "openai/gpt-5.3-codex",
      frontend: "google/gemini-3.1-pro",
      secondary: "anthropic/claude-sonnet-4-6",
      research: "google/gemini-3-flash",
    },
    agentOverrides: {
      sisyphus: { model: "anthropic/claude-opus-4-6" },
      atlas: { model: "anthropic/claude-opus-4-6" },
      prometheus: { model: "anthropic/claude-opus-4-6" },
      metis: { model: "anthropic/claude-opus-4-6" },
      momus: { model: "openai/gpt-5.3-codex" },
      oracle: { model: "openai/gpt-5.3-codex" },
      hephaestus: { model: "openai/gpt-5.3-codex" },
      librarian: { model: "anthropic/claude-sonnet-4-6" },
      explore: { model: "anthropic/claude-sonnet-4-6" },
      "multimodal-looker": { model: "google/gemini-3.1-pro" },
      "frontend-ui-ux-engineer": { model: "google/gemini-3.1-pro" },
      architect: { model: "anthropic/claude-opus-4-6" },
      "database-expert": { model: "anthropic/claude-opus-4-6" },
      devrel: { model: "kimi-for-coding/k2p5" },
      "image-generator": { model: "google/gemini-3.1-pro" },
    },
    categoryOverrides: {
      deep: { model: "anthropic/claude-opus-4-6" },
      ultrabrain: { model: "openai/gpt-5.3-codex" },
      "deep-reasoning": { model: "anthropic/claude-opus-4-6" },
      "unspecified-high": { model: "anthropic/claude-opus-4-6" },
      backend: { model: "openai/gpt-5.3-codex" },
      debugging: { model: "openai/gpt-5.3-codex" },
      refactor: { model: "openai/gpt-5.3-codex" },
      testing: { model: "openai/gpt-5.3-codex" },
      deployment: { model: "anthropic/claude-sonnet-4-6" },
      migration: { model: "openai/gpt-5.3-codex" },
      "visual-engineering": { model: "google/gemini-3.1-pro" },
      artistry: { model: "google/gemini-3.1-pro" },
      accessibility: { model: "google/gemini-3.1-pro" },
      i18n: { model: "anthropic/claude-sonnet-4-6" },
      seo: { model: "google/gemini-3.1-pro" },
      "develop-web-game": { model: "google/gemini-3.1-pro" },
      quick: { model: "anthropic/claude-sonnet-4-6" },
      "unspecified-low": { model: "google/gemini-3-flash" },
      writing: { model: "kimi-for-coding/k2p5" },
      research: { model: "google/gemini-3-flash" },
      security: { model: "openai/gpt-5.3-codex" },
      performance: { model: "openai/gpt-5.3-codex" },
      "code-review": { model: "openai/gpt-5.3-codex" },
      "spec-review": { model: "openai/gpt-5.3-codex" },
      "api-design": { model: "anthropic/claude-opus-4-6" },
      architect: { model: "anthropic/claude-opus-4-6" },
      database: { model: "anthropic/claude-opus-4-6" },
      brainstorming: { model: "anthropic/claude-opus-4-6" },
      "business-analysis": { model: "anthropic/claude-opus-4-6" },
      "token-efficiency": { model: "anthropic/claude-sonnet-4-6" },
      introspection: { model: "anthropic/claude-sonnet-4-6" },
      "image-generation": { model: "google/gemini-3.1-pro" },
    },
    agents: {
      coder: "anthropic/claude-opus-4-6",
      task: "google/gemini-3.1-pro",
      title: "anthropic/claude-sonnet-4-6",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 12. budget-mixed — OMO EXCLUSIVE — Cheapest viable
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "budget-mixed",
    scope: "economy",
    description: "Cheapest viable — Sonnet + Flash + Kimi, minimal cost",
    models: {
      primary: "anthropic/claude-sonnet-4-6",
      research: "google/gemini-3-flash",
      secondary: "kimi-for-coding/k2p5",
    },
    agentOverrides: {
      sisyphus: { model: "anthropic/claude-sonnet-4-6" },
      atlas: { model: "anthropic/claude-sonnet-4-6" },
      prometheus: { model: "anthropic/claude-sonnet-4-6" },
      metis: { model: "kimi-for-coding/k2p5" },
      momus: { model: "kimi-for-coding/k2p5" },
      oracle: { model: "kimi-for-coding/k2p5" },
      hephaestus: { model: "anthropic/claude-sonnet-4-6" },
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "google/gemini-3-flash" },
      "multimodal-looker": { model: "google/gemini-3-flash" },
      "frontend-ui-ux-engineer": { model: "google/gemini-3-flash" },
      architect: { model: "anthropic/claude-sonnet-4-6" },
      "database-expert": { model: "kimi-for-coding/k2p5" },
      devrel: { model: "kimi-for-coding/k2p5" },
      "image-generator": { model: "google/gemini-3-flash" },
    },
    categoryOverrides: {
      deep: { model: "anthropic/claude-sonnet-4-6" },
      ultrabrain: { model: "anthropic/claude-sonnet-4-6" },
      quick: { model: "google/gemini-3-flash" },
      "unspecified-low": { model: "google/gemini-3-flash" },
      research: { model: "google/gemini-3-flash" },
      writing: { model: "kimi-for-coding/k2p5" },
      "code-review": { model: "kimi-for-coding/k2p5" },
    },
    agents: {
      coder: "anthropic/claude-sonnet-4-6",
      task: "google/gemini-3-flash",
      title: "kimi-for-coding/k2p5",
    },
    settings: { autoCompact: true },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 13. local-free — OMO EXCLUSIVE — Zero API cost
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "local-free",
    scope: "economy",
    description: "100% local models via Ollama — zero API cost",
    models: { primary: "ollama/deepseek-coder-v3" },
    agentOverrides: allScope("ollama/deepseek-coder-v3"),
    categoryOverrides: allCategoryScope("ollama/deepseek-coder-v3"),
    agents: {
      coder: "ollama/deepseek-coder-v3",
      task: "ollama/deepseek-coder-v3",
      title: "ollama/deepseek-coder-v3",
    },
    settings: { autoCompact: true },
  },
];

// ─── Legacy compat: Record-based access ──────────────────────────────
export const profiles: Record<string, Profile> = {};
for (const p of profilesList) {
  profiles[p.name] = p;
}

// ─── Legacy alias (some commands use the old v1 format) ──────────────
export type { Profile as ProfileV2 };

export function getProfile(key: string): Profile | undefined {
  return profiles[key];
}

export function listProfileKeys(): string[] {
  return Object.keys(profiles);
}
