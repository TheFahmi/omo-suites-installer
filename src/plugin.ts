import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __pkgDir = dirname(fileURLToPath(import.meta.url));
let PLUGIN_VERSION = '1.2.0';
try {
  // Try sibling package.json first (built dist/), then parent (src/)
  for (const p of [resolve(__pkgDir, 'package.json'), resolve(__pkgDir, '..', 'package.json')]) {
    if (existsSync(p)) { PLUGIN_VERSION = JSON.parse(readFileSync(p, 'utf-8')).version; break; }
  }
} catch {}

// Import existing data
import { agents, categoryRouting, getAgentForCategory, listCategories, listAgentIds } from "./data/agents";
import { profiles, profilesList, getProfile } from "./data/profiles";
import { mcpServers, listMcpKeys, getMcpServer } from "./data/mcp-registry";
import { lspServers, listLspKeys } from "./data/lsp-registry";

// ─── Config Helpers ──────────────────────────────────────────────────

function getOmoConfigPath(directory?: string): string {
  const localPath = join(directory || process.cwd(), ".opencode", "oh-my-opencode.json");
  const globalPath = join(homedir(), ".config", "opencode", "oh-my-opencode.json");
  return existsSync(localPath) ? localPath : globalPath;
}

function getOpencodeConfigPath(directory?: string): string {
  // Check multiple locations
  const candidates = [
    join(directory || process.cwd(), ".opencode", "opencode.json"),
    join(directory || process.cwd(), ".opencode.json"),
    join(homedir(), ".config", "opencode", "opencode.json"),
    join(homedir(), ".opencode.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0]; // default to project-local
}

function readJsonFile(path: string): any {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: any): void {
  // Backup first
  if (existsSync(path)) {
    try {
      writeFileSync(path + ".bak", readFileSync(path));
    } catch { /* ignore backup failures */ }
  }
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ─── Format Helpers ──────────────────────────────────────────────────

function formatProfileList(): string {
  const lines: string[] = ["# OMO Suites Profiles (13 profiles — 4 scope types)", ""];
  const scopeIcons: Record<string, string> = { all: "🌐", lead: "👑", mixed: "🔀", economy: "💰" };

  for (const p of profilesList) {
    const icon = scopeIcons[p.scope] || "📋";
    lines.push(`${icon} **${p.name}** [${p.scope}]`);
    lines.push(`   ${p.description}`);
    lines.push(`   Primary: ${p.models.primary}`);
    if (p.models.secondary) lines.push(`   Secondary: ${p.models.secondary}`);
    if (p.models.frontend) lines.push(`   Frontend: ${p.models.frontend}`);
    if (p.models.research) lines.push(`   Research: ${p.models.research}`);
    if (p.models.review) lines.push(`   Review: ${p.models.review}`);
    lines.push(`   Agent overrides: ${Object.keys(p.agentOverrides).length} | Category overrides: ${Object.keys(p.categoryOverrides).length}`);
    lines.push("");
  }

  lines.push(`Total: ${profilesList.length} profiles (OCS has 8)`);
  return lines.join("\n");
}

function formatAgentList(): string {
  const lines: string[] = ["# OMO Suites Agents (15 agents — 32 task categories)", ""];

  for (const [id, agent] of Object.entries(agents)) {
    lines.push(`${agent.emoji} **${agent.name}** (${id})`);
    lines.push(`   ${agent.description}`);
    lines.push(`   Model: ${agent.preferredModel} | Thinking: ${agent.thinkingBudget} tokens`);
    lines.push(`   Tags: ${agent.tags.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatMcpList(): string {
  const lines: string[] = ["# OMO Suites MCP Registry (11 servers)", ""];

  for (const [key, server] of Object.entries(mcpServers)) {
    const envKeys = server.env ? Object.keys(server.env).join(", ") : "none";
    lines.push(`🔌 **${server.name}** (${key})`);
    lines.push(`   ${server.description}`);
    lines.push(`   Command: ${server.command} ${server.args.join(" ")}`);
    lines.push(`   Env vars: ${envKeys}`);
    lines.push(`   Tags: ${server.tags.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatCategoryList(): string {
  const lines: string[] = ["# Task Category Routing (32 categories)", ""];

  for (const [category, agentId] of Object.entries(categoryRouting)) {
    const agent = agents[agentId];
    lines.push(`• **${category}** → ${agent?.emoji || "?"} ${agent?.name || agentId}`);
  }

  return lines.join("\n");
}

// ─── Plugin Definition ───────────────────────────────────────────────

const OmoSuitesPlugin: Plugin = async (ctx) => {
  console.log(`[OMO Suites] v${PLUGIN_VERSION} loaded`);
  return {
    tool: {
      // ═══════════════════════════════════════════════════════════════
      // 1. Profile tools
      // ═══════════════════════════════════════════════════════════════
      omocs_profile_list: tool({
        description: "List all available OMO Suites profiles with model assignments. 13 profiles across 4 scope types (all, lead, mixed, economy). More than OCS's 8.",
        args: {},
        async execute() {
          return formatProfileList();
        },
      }),

      omocs_profile_switch: tool({
        description: "Switch to a different OMO Suites profile, updating oh-my-opencode agent and category model assignments. Creates backup before writing.",
        args: {
          profile: tool.schema.string().describe("Profile name to switch to (e.g. ultra-mixed, opus-4.6-all, budget-mixed)"),
        },
        async execute(args, context) {
          const profileData = getProfile(args.profile);
          if (!profileData) {
            const available = profilesList.map(p => p.name).join(", ");
            return `❌ Profile '${args.profile}' not found.\n\nAvailable profiles: ${available}`;
          }

          // Update oh-my-opencode.json
          const omoPath = getOmoConfigPath(context.directory);
          const omoConfig = readJsonFile(omoPath);

          // Apply agent overrides
          if (!omoConfig.agents) omoConfig.agents = {};
          for (const [agentId, override] of Object.entries(profileData.agentOverrides)) {
            if (!omoConfig.agents[agentId]) omoConfig.agents[agentId] = {};
            omoConfig.agents[agentId].model = override.model;
          }

          // Apply category overrides
          if (!omoConfig.categories) omoConfig.categories = {};
          for (const [cat, override] of Object.entries(profileData.categoryOverrides)) {
            if (!omoConfig.categories[cat]) omoConfig.categories[cat] = {};
            omoConfig.categories[cat].model = override.model;
          }

          omoConfig.activeProfile = args.profile;
          omoConfig.scope = profileData.scope;
          writeJsonFile(omoPath, omoConfig);

          // Also update .opencode.json agents block
          const ocPath = getOpencodeConfigPath(context.directory);
          const ocConfig = readJsonFile(ocPath);
          ocConfig.agents = {
            ...ocConfig.agents,
            ...profileData.agents,
          };
          writeJsonFile(ocPath, ocConfig);

          const lines = [
            `✅ Switched to profile: **${profileData.name}** [${profileData.scope}]`,
            `   ${profileData.description}`,
            "",
            `   Primary: ${profileData.models.primary}`,
          ];
          if (profileData.models.secondary) lines.push(`   Secondary: ${profileData.models.secondary}`);
          if (profileData.models.frontend) lines.push(`   Frontend: ${profileData.models.frontend}`);
          if (profileData.models.review) lines.push(`   Review: ${profileData.models.review}`);
          if (profileData.models.research) lines.push(`   Research: ${profileData.models.research}`);
          lines.push("");
          lines.push(`   Agent overrides applied: ${Object.keys(profileData.agentOverrides).length}`);
          lines.push(`   Category overrides applied: ${Object.keys(profileData.categoryOverrides).length}`);
          lines.push(`   Configs updated: ${omoPath}, ${ocPath}`);

          return lines.join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 2. Agent tools
      // ═══════════════════════════════════════════════════════════════
      omocs_agent_route: tool({
        description: "Find the best agent for a task category (e.g. visual-engineering, debugging, ultrabrain, code-review). Returns agent details and routing info.",
        args: {
          category: tool.schema.string().describe("Task category (e.g. debugging, visual-engineering, code-review, ultrabrain, database, security)"),
        },
        async execute(args) {
          const agent = getAgentForCategory(args.category);
          if (!agent) {
            const categories = listCategories().join(", ");
            return `❌ Unknown category '${args.category}'.\n\nAvailable categories:\n${categories}`;
          }
          return [
            `🎯 Category: **${args.category}**`,
            `   Routed to: ${agent.emoji} **${agent.name}** (${agent.id})`,
            `   ${agent.description}`,
            `   Model: ${agent.preferredModel}`,
            `   Thinking budget: ${agent.thinkingBudget} tokens`,
            `   Tools: ${agent.tools.join(", ")}`,
            `   Tags: ${agent.tags.join(", ")}`,
          ].join("\n");
        },
      }),

      omocs_agent_info: tool({
        description: "Get detailed info about a specific agent (model, thinking budget, description, tools, tags). Use agent ID like 'sisyphus', 'momus', 'frontend-ui-ux-engineer'.",
        args: {
          name: tool.schema.string().describe("Agent ID (e.g. sisyphus, atlas, momus, frontend-ui-ux-engineer)"),
        },
        async execute(args) {
          const agent = agents[args.name];
          if (!agent) {
            const ids = listAgentIds().join(", ");
            return `❌ Agent '${args.name}' not found.\n\nAvailable agents: ${ids}`;
          }

          // Find categories routed to this agent
          const routedCategories = Object.entries(categoryRouting)
            .filter(([_, agentId]) => agentId === args.name)
            .map(([cat]) => cat);

          return [
            `${agent.emoji} **${agent.name}** (${agent.id})`,
            `   ${agent.description}`,
            "",
            `   Model: ${agent.preferredModel}`,
            `   Thinking budget: ${agent.thinkingBudget} tokens`,
            `   System prompt: ${agent.systemPromptFile}`,
            `   Tools: ${agent.tools.join(", ")}`,
            `   Tags: ${agent.tags.join(", ")}`,
            "",
            `   Routes ${routedCategories.length} categories:`,
            ...routedCategories.map(c => `   • ${c}`),
          ].join("\n");
        },
      }),

      omocs_agent_list: tool({
        description: "List all 15 available OMO Suites agents with their models, thinking budgets, and specializations.",
        args: {},
        async execute() {
          return formatAgentList();
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 3. MCP tools
      // ═══════════════════════════════════════════════════════════════
      omocs_mcp_install: tool({
        description: "Install an MCP server from the OMO Suites registry and add it to opencode.json. Supports: postgres, fetch, filesystem, brave-search, slack, redis, docker, sentry, context7, grep-app, exa-websearch.",
        args: {
          server: tool.schema.string().describe("MCP server name from registry (e.g. context7, postgres, brave-search)"),
        },
        async execute(args, context) {
          const mcp = getMcpServer(args.server);
          if (!mcp) {
            const available = listMcpKeys().join(", ");
            return `❌ MCP server '${args.server}' not found.\n\nAvailable: ${available}`;
          }

          // Add to opencode.json
          const ocPath = getOpencodeConfigPath(context.directory);
          const ocConfig = readJsonFile(ocPath);

          if (!ocConfig.mcpServers) ocConfig.mcpServers = {};
          ocConfig.mcpServers[args.server] = {
            type: mcp.type || "stdio",
            command: mcp.command,
            args: mcp.args,
            ...(mcp.env && Object.keys(mcp.env).length > 0 ? { env: mcp.env } : {}),
          };

          writeJsonFile(ocPath, ocConfig);

          const lines = [
            `✅ Installed MCP server: **${mcp.name}** (${args.server})`,
            `   ${mcp.description}`,
            `   Command: ${mcp.command} ${mcp.args.join(" ")}`,
            `   Config: ${ocPath}`,
          ];

          if (mcp.env && Object.keys(mcp.env).length > 0) {
            lines.push("");
            lines.push("   ⚠️ Environment variables needed:");
            for (const [key, value] of Object.entries(mcp.env)) {
              lines.push(`   • ${key}=${value || "<set your value>"}`);
            }
            lines.push("   Set these in the env block of your opencode.json mcpServers config.");
          }

          return lines.join("\n");
        },
      }),

      omocs_mcp_list: tool({
        description: "List all available MCP servers in the OMO Suites registry (11 servers). Shows commands, env vars needed, and tags.",
        args: {},
        async execute() {
          return formatMcpList();
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 4. LSP tools
      // ═══════════════════════════════════════════════════════════════
      omocs_lsp_detect: tool({
        description: "Detect project stack and suggest LSP servers to install. Scans for config files (tsconfig.json, pyproject.toml, etc.) and recommends matching LSP servers.",
        args: {},
        async execute(_args, context) {
          const dir = context.directory;
          const suggestions: string[] = [];
          const detected: string[] = [];

          for (const [key, lsp] of Object.entries(lspServers)) {
            const found = lsp.detect.some((pattern) => {
              if (pattern.includes("*")) return false; // skip glob patterns, check specific files
              return existsSync(join(dir, pattern));
            });
            if (found) {
              detected.push(key);
              suggestions.push(`✅ **${lsp.name}** (${key}) — detected via ${lsp.detect.filter(d => !d.includes("*") && existsSync(join(dir, d))).join(", ")}`);
              suggestions.push(`   Install: ${lsp.install}`);
              suggestions.push(`   Command: ${lsp.command} ${lsp.args.join(" ")}`);
              suggestions.push("");
            }
          }

          if (suggestions.length === 0) {
            return `No LSP servers detected for project at ${dir}.\n\nAvailable LSP servers: ${listLspKeys().join(", ")}`;
          }

          return [
            `# LSP Detection Results for ${dir}`,
            "",
            `Detected ${detected.length} LSP server(s):`,
            "",
            ...suggestions,
          ].join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 5. Doctor / health check
      // ═══════════════════════════════════════════════════════════════
      omocs_doctor: tool({
        description: "Run OMO Suites health check — verify OpenCode config, oh-my-opencode, profiles, LSPs, MCP servers. Comprehensive diagnostic.",
        args: {},
        async execute(_args, context) {
          const checks: string[] = ["# 🩺 OMO Suites Health Check", ""];
          const dir = context.directory;

          // 1. Check opencode.json
          const ocPath = getOpencodeConfigPath(dir);
          if (existsSync(ocPath)) {
            const config = readJsonFile(ocPath);
            const mcpCount = config.mcpServers ? Object.keys(config.mcpServers).length : 0;
            const lspCount = config.lsp ? Object.keys(config.lsp).length : 0;
            checks.push(`✅ opencode.json found: ${ocPath}`);
            checks.push(`   MCP servers: ${mcpCount} | LSP servers: ${lspCount}`);
            if (config.agents) {
              checks.push(`   Agents: coder=${config.agents.coder || "default"}, task=${config.agents.task || "default"}`);
            }
          } else {
            checks.push(`❌ opencode.json not found`);
            checks.push(`   Run omocs_profile_switch to create one.`);
          }
          checks.push("");

          // 2. Check oh-my-opencode.json
          const omoPath = getOmoConfigPath(dir);
          if (existsSync(omoPath)) {
            const config = readJsonFile(omoPath);
            checks.push(`✅ oh-my-opencode.json found: ${omoPath}`);
            if (config.activeProfile) {
              checks.push(`   Active profile: ${config.activeProfile} [${config.scope || "unknown"}]`);
            }
            const agentCount = config.agents ? Object.keys(config.agents).length : 0;
            const catCount = config.categories ? Object.keys(config.categories).length : 0;
            checks.push(`   Agent overrides: ${agentCount} | Category overrides: ${catCount}`);
          } else {
            checks.push(`⚠️ oh-my-opencode.json not found`);
            checks.push(`   This is optional — use omocs_profile_switch to create one.`);
          }
          checks.push("");

          // 3. Check environment API keys
          const envKeys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GITHUB_TOKEN"];
          const foundKeys = envKeys.filter(k => process.env[k]);
          if (foundKeys.length > 0) {
            checks.push(`✅ API keys found in environment: ${foundKeys.join(", ")}`);
          } else {
            checks.push(`⚠️ No API keys in environment (${envKeys.join(", ")})`);
            checks.push(`   Keys may be configured elsewhere (provider config, etc.)`);
          }
          checks.push("");

          // 4. Profile summary
          checks.push(`📋 Available profiles: ${profilesList.length} (OCS has 8)`);
          checks.push(`   Scopes: all (${profilesList.filter(p => p.scope === "all").length}), lead (${profilesList.filter(p => p.scope === "lead").length}), mixed (${profilesList.filter(p => p.scope === "mixed").length}), economy (${profilesList.filter(p => p.scope === "economy").length})`);
          checks.push("");

          // 5. Agent summary
          checks.push(`🤖 Available agents: ${Object.keys(agents).length}`);
          checks.push(`📂 Task categories: ${Object.keys(categoryRouting).length}`);
          checks.push("");

          // 6. MCP registry
          checks.push(`🔌 MCP registry: ${Object.keys(mcpServers).length} servers available`);
          checks.push(`🔧 LSP registry: ${Object.keys(lspServers).length} servers available`);

          return checks.join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 6. Account/provider status
      // ═══════════════════════════════════════════════════════════════
      omocs_account_status: tool({
        description: "Check API key status and provider health. Shows which API keys are configured in environment variables.",
        args: {},
        async execute() {
          const providers = [
            { name: "Anthropic", env: "ANTHROPIC_API_KEY", prefix: "sk-ant-" },
            { name: "OpenAI", env: "OPENAI_API_KEY", prefix: "sk-" },
            { name: "Google", env: "GOOGLE_API_KEY", prefix: "AI" },
            { name: "GitHub", env: "GITHUB_TOKEN", prefix: "gh" },
            { name: "Brave Search", env: "BRAVE_API_KEY", prefix: "BSA" },
            { name: "Sentry", env: "SENTRY_AUTH_TOKEN", prefix: "sntr" },
            { name: "Exa", env: "EXA_API_KEY", prefix: "exa-" },
          ];

          const lines = ["# 🔑 Provider Status", ""];

          for (const p of providers) {
            const key = process.env[p.env];
            if (key) {
              const masked = key.slice(0, 8) + "..." + key.slice(-4);
              lines.push(`✅ **${p.name}** — ${p.env} configured (${masked})`);
            } else {
              lines.push(`⚪ **${p.name}** — ${p.env} not set`);
            }
          }

          return lines.join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 7. Stats summary
      // ═══════════════════════════════════════════════════════════════
      omocs_stats_summary: tool({
        description: "Get token usage summary and cost estimates. Reads from OMO Suites stats file if available.",
        args: {
          period: tool.schema.string().optional().describe("Period: today, week, month, all (default: today)"),
        },
        async execute(args) {
          const statsPath = join(homedir(), ".omocs", "stats.json");
          if (!existsSync(statsPath)) {
            return "📊 No usage stats recorded yet.\n\nStats are tracked when you use OMO Suites CLI to switch profiles and run tasks.\nFile location: ~/.omocs/stats.json";
          }

          try {
            const stats = readJsonFile(statsPath);
            const period = args.period || "today";
            return [
              `# 📊 Usage Stats (${period})`,
              "",
              JSON.stringify(stats, null, 2),
            ].join("\n");
          } catch {
            return "❌ Could not read stats file.";
          }
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 8. Config getter
      // ═══════════════════════════════════════════════════════════════
      omocs_config_get: tool({
        description: "Get current oh-my-opencode and opencode configuration. Shows agents, categories, MCP servers, LSP servers, and active profile.",
        args: {
          section: tool.schema.string().optional().describe("Section: agents, categories, mcp, lsp, profiles, all (default: all)"),
        },
        async execute(args, context) {
          const section = args.section || "all";
          const dir = context.directory;
          const lines: string[] = ["# OMO Suites Configuration", ""];

          if (section === "all" || section === "profiles") {
            const omoConfig = readJsonFile(getOmoConfigPath(dir));
            lines.push(`## Active Profile: ${omoConfig.activeProfile || "not set"} [${omoConfig.scope || "unknown"}]`);
            lines.push("");
          }

          if (section === "all" || section === "agents") {
            lines.push("## Agents (from oh-my-opencode.json)");
            const omoConfig = readJsonFile(getOmoConfigPath(dir));
            if (omoConfig.agents && Object.keys(omoConfig.agents).length > 0) {
              for (const [id, config] of Object.entries(omoConfig.agents as Record<string, any>)) {
                lines.push(`  • ${id}: model=${config.model || "default"}`);
              }
            } else {
              lines.push("  (no agent overrides configured)");
            }
            lines.push("");
          }

          if (section === "all" || section === "categories") {
            lines.push("## Categories (from oh-my-opencode.json)");
            const omoConfig = readJsonFile(getOmoConfigPath(dir));
            if (omoConfig.categories && Object.keys(omoConfig.categories).length > 0) {
              for (const [cat, config] of Object.entries(omoConfig.categories as Record<string, any>)) {
                lines.push(`  • ${cat}: model=${config.model || "default"}`);
              }
            } else {
              lines.push("  (no category overrides configured)");
            }
            lines.push("");
          }

          if (section === "all" || section === "mcp") {
            lines.push("## MCP Servers (from opencode.json)");
            const ocConfig = readJsonFile(getOpencodeConfigPath(dir));
            if (ocConfig.mcpServers && Object.keys(ocConfig.mcpServers).length > 0) {
              for (const [name, config] of Object.entries(ocConfig.mcpServers as Record<string, any>)) {
                lines.push(`  • ${name}: ${config.command} ${(config.args || []).join(" ")}`);
              }
            } else {
              lines.push("  (no MCP servers configured)");
            }
            lines.push("");
          }

          if (section === "all" || section === "lsp") {
            lines.push("## LSP Servers (from opencode.json)");
            const ocConfig = readJsonFile(getOpencodeConfigPath(dir));
            if (ocConfig.lsp && Object.keys(ocConfig.lsp).length > 0) {
              for (const [name, config] of Object.entries(ocConfig.lsp as Record<string, any>)) {
                lines.push(`  • ${name}: ${config.command} ${(config.args || []).join(" ")}`);
              }
            } else {
              lines.push("  (no LSP servers configured)");
            }
            lines.push("");
          }

          return lines.join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 9. Category list
      // ═══════════════════════════════════════════════════════════════
      omocs_categories: tool({
        description: "List all 32 task categories and their agent routing. Shows which agent handles each type of task.",
        args: {},
        async execute() {
          return formatCategoryList();
        },
      }),
    },

    // ─── System prompt injection ─────────────────────────────────────
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(
        `You have OMO Suites tools available (omocs_*). Use them for:\n` +
        `- Profile switching: omocs_profile_list, omocs_profile_switch\n` +
        `- Agent routing: omocs_agent_route, omocs_agent_info, omocs_agent_list\n` +
        `- MCP management: omocs_mcp_list, omocs_mcp_install\n` +
        `- LSP detection: omocs_lsp_detect\n` +
        `- Health check: omocs_doctor\n` +
        `- Config: omocs_config_get, omocs_account_status, omocs_stats_summary\n` +
        `- Categories: omocs_categories\n` +
        `\n` +
        `OMO Suites has 13 profiles (vs OCS's 8), 15 agents, 32 task categories, 11 MCP servers, 10 LSP configs.`
      );
    },
  };
};

export default OmoSuitesPlugin;
