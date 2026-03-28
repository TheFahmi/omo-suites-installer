import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __pkgDir = dirname(fileURLToPath(import.meta.url));
let PLUGIN_VERSION = '0.0.0-unknown';
try {
  // Try sibling package.json first (built dist/), then parent (src/), then grandparent
  for (const p of [
    resolve(__pkgDir, 'package.json'),
    resolve(__pkgDir, '..', 'package.json'),
    resolve(__pkgDir, '..', '..', 'package.json'),
  ]) {
    if (existsSync(p)) { PLUGIN_VERSION = JSON.parse(readFileSync(p, 'utf-8')).version || PLUGIN_VERSION; break; }
  }
} catch {}

// Import existing data
import { agents, categoryRouting, getAgentForCategory, listCategories, listAgentIds } from "./data/agents";
import { profiles, profilesList, getProfile } from "./data/profiles";
import { mcpServers, listMcpKeys, getMcpServer } from "./data/mcp-registry";
import { lspServers, listLspKeys } from "./data/lsp-registry";
import { listTasks, createTask, updateTask, moveTask } from "./data/launchboard";

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
  // Atomic write: write to temp file then rename
  const tmpFile = path + '.tmp.' + randomBytes(4).toString('hex');
  try {
    writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    renameSync(tmpFile, path);
  } catch (err) {
    // Clean up temp file on failure, fall back to direct write
    try { if (existsSync(tmpFile)) writeFileSync(tmpFile, ''); } catch {}
    writeFileSync(path, JSON.stringify(data, null, 2));
  }
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
  const lines: string[] = ["# OMO Suites Agents (28 agents — 67 task categories)", ""];

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
  const lines: string[] = ["# Task Category Routing (67 categories)", ""];

  for (const [category, agentId] of Object.entries(categoryRouting)) {
    const agent = agents[agentId];
    lines.push(`• **${category}** → ${agent?.emoji || "?"} ${agent?.name || agentId}`);
  }

  return lines.join("\n");
}

// ─── Auto-Update Check ───────────────────────────────────────────────

function checkPluginUpdate() {
  const CACHE_DIR = join(homedir(), '.omocs');
  const CACHE_FILE = join(CACHE_DIR, '.update-check');
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const PACKAGE_NAME = 'omo-suites';

  try {
    // Check cache
    if (existsSync(CACHE_FILE)) {
      const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cache.lastCheck < CHECK_INTERVAL_MS) {
        if (cache.latestVersion && cache.latestVersion !== PLUGIN_VERSION) {
          console.log(`[OMO Suites] Update available: ${PLUGIN_VERSION} -> ${cache.latestVersion}. Run: npm install -g ${PACKAGE_NAME}@latest`);
        }
        return;
      }
    }

    // Background check — don't block plugin loading
    const { execSync: execSyncBg } = require('child_process');
    try {
      const latest = execSyncBg(`npm view ${PACKAGE_NAME} version`, {
        encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      // Write cache
      if (!existsSync(CACHE_DIR)) {
        const { mkdirSync } = require('fs');
        mkdirSync(CACHE_DIR, { recursive: true });
      }
      writeFileSync(CACHE_FILE, JSON.stringify({ lastCheck: Date.now(), latestVersion: latest }));

      if (latest !== PLUGIN_VERSION) {
        console.log(`[OMO Suites] Update available: ${PLUGIN_VERSION} -> ${latest}. Run: npm install -g ${PACKAGE_NAME}@latest`);
        // Auto-update silently
        try {
          execSyncBg(`npm install -g ${PACKAGE_NAME}@latest`, {
            encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe']
          });
          console.log(`[OMO Suites] Auto-updated to v${latest}. Restart OpenCode to use.`);
        } catch {}
      }
    } catch {}
  } catch {}
}

// ─── Plugin Definition ───────────────────────────────────────────────

import { trackEvent } from "./utils/telemetry.ts";

const OmoSuitesPlugin: Plugin = async (ctx) => {
  trackEvent("plugin_loaded", { plugin: "omo-suites", status: "success" });
  console.log(`[OMO Suites] v${PLUGIN_VERSION} loaded`);

  // Check for updates on plugin load (OpenCode startup)
  checkPluginUpdate();

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
        description: "List all 28 available OMO Suites agents with their models, thinking budgets, and specializations.",
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
              if (pattern.includes("*")) {
                // Glob pattern: check if any file in the directory matches
                try {
                  const ext = pattern.replace(/^\*\./, '.');
                  const files = readdirSync(dir);
                  return files.some(f => f.endsWith(ext));
                } catch {
                  return false;
                }
              }
              return existsSync(join(dir, pattern));
            });
            if (found) {
              detected.push(key);
              suggestions.push(`✅ **${lsp.name}** (${key}) — detected via ${lsp.detect.filter(d => {
                if (d.includes("*")) {
                  try {
                    const ext = d.replace(/^\*\./, '.');
                    return readdirSync(dir).some(f => f.endsWith(ext));
                  } catch { return false; }
                }
                return existsSync(join(dir, d));
              }).join(", ")}`);
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
        description: "List all 67 task categories and their agent routing. Shows which agent handles each type of task.",
        args: {},
        async execute() {
          return formatCategoryList();
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 10. Launchboard integration
      // ═══════════════════════════════════════════════════════════════
      omocs_task_list: tool({
        description: "List tasks from Launchboard board. Filter by workspace, column, priority, or search query.",
        args: {
          workspace: tool.schema.string().optional().describe("Workspace name"),
          column: tool.schema.string().optional().describe("Column: backlog, planned, ready, in-progress, testing, done"),
          priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low"),
          search: tool.schema.string().optional().describe("Search query for task title"),
        },
        async execute(args) {
          try {
            const tasks = await listTasks({
              workspace: args.workspace,
              column: args.column,
              priority: args.priority,
              search: args.search,
            });

            if (!tasks || tasks.length === 0) {
              return "📋 No tasks found matching your filters.";
            }

            const priorityNames: Record<number, string> = { 1: '🔴 critical', 2: '🟠 high', 3: '🟡 medium', 4: '🟢 low' };
            const lines = [`# 📋 Launchboard — ${tasks.length} task(s)`, ""];

            for (const t of tasks) {
              const labels = t.labels?.map((l: any) => l.name).join(", ") || "none";
              lines.push(`• **${t.shortId}** — ${t.title}`);
              lines.push(`  Priority: ${priorityNames[t.priority] || t.priority} | Progress: ${t.progress ?? 0}% | Labels: ${labels}`);
              if (t.assignee) lines.push(`  Assignee: ${t.assignee}`);
              lines.push("");
            }

            return lines.join("\n");
          } catch (err: any) {
            return `❌ Failed to list tasks: ${err.message}`;
          }
        },
      }),

      omocs_task_create: tool({
        description: "Create a new task on the Launchboard board.",
        args: {
          title: tool.schema.string().describe("Task title"),
          priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low (default: 3)"),
          description: tool.schema.string().optional().describe("Task description"),
          labels: tool.schema.array(tool.schema.string()).optional().describe("Label names like feat, bug, chore"),
        },
        async execute(args) {
          try {
            const task = await createTask({
              title: args.title,
              priority: args.priority,
              description: args.description,
              labels: args.labels,
            });

            return [
              `✅ Task created: **${task.shortId}**`,
              `   Title: ${task.title}`,
              `   Priority: ${task.priority}`,
              `   ID: ${task.id}`,
            ].join("\n");
          } catch (err: any) {
            return `❌ Failed to create task: ${err.message}`;
          }
        },
      }),

      omocs_task_update: tool({
        description: "Update an existing task. Use shortId (e.g., feat-a1b2) or UUID.",
        args: {
          taskId: tool.schema.string().describe("Task shortId or UUID"),
          title: tool.schema.string().optional().describe("New title"),
          priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low"),
          progress: tool.schema.number().optional().describe("Progress 0-100"),
          column: tool.schema.string().optional().describe("Move to column: backlog, planned, ready, in-progress, testing, done"),
        },
        async execute(args) {
          try {
            const updated = await updateTask(args.taskId, {
              title: args.title,
              priority: args.priority,
              progress: args.progress,
              column: args.column,
            });

            return [
              `✅ Task updated: **${updated.shortId}**`,
              `   Title: ${updated.title}`,
              `   Priority: ${updated.priority}`,
              `   Progress: ${updated.progress ?? 0}%`,
            ].join("\n");
          } catch (err: any) {
            return `❌ Failed to update task: ${err.message}`;
          }
        },
      }),

      omocs_task_move: tool({
        description: "Move a task to a different column (e.g., from 'in-progress' to 'testing').",
        args: {
          taskId: tool.schema.string().describe("Task shortId or UUID"),
          column: tool.schema.string().describe("Target column: backlog, planned, ready, in-progress, testing, done"),
        },
        async execute(args) {
          try {
            const moved = await moveTask(args.taskId, args.column);

            return [
              `✅ Task moved: **${moved.shortId}**`,
              `   Title: ${moved.title}`,
              `   Moved to: ${args.column}`,
            ].join("\n");
          } catch (err: any) {
            return `❌ Failed to move task: ${err.message}`;
          }
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 11. Init Deep — hierarchical AGENTS.md generator
      // ═══════════════════════════════════════════════════════════════
      omocs_init_deep: tool({
        description: "Auto-generate hierarchical AGENTS.md files per significant folder. Scans project structure, infers purpose, tech stack, and conventions. Creates root + per-folder AGENTS.md.",
        args: {
          path: tool.schema.string().optional().describe("Project root directory (default: current directory)"),
          depth: tool.schema.number().optional().describe("Maximum directory depth to scan (default: 3)"),
          dryRun: tool.schema.boolean().optional().describe("Preview what would be generated without writing files"),
        },
        async execute(args, context) {
          const { existsSync: exists, readdirSync: readDir, statSync: stat, writeFileSync: writeFile, mkdirSync: mkDir } = await import("fs");
          const { join: pathJoin, basename: baseName, relative: relPath } = await import("path");

          const rootPath = args.path ? pathJoin(context.directory, args.path) : context.directory;
          const maxDepth = args.depth || 3;
          const dryRun = args.dryRun || false;

          if (!exists(rootPath)) {
            return `❌ Directory not found: ${rootPath}`;
          }

          const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', '.turbo', 'coverage', 'vendor', '.venv', 'venv', 'target', 'out']);
          const SIGNIFICANT = new Set(['src', 'lib', 'utils', 'components', 'pages', 'app', 'api', 'routes', 'controllers', 'services', 'models', 'middleware', 'hooks', 'types', 'config', 'core', 'common', 'shared', 'modules', 'features', 'data', 'commands', 'packages', 'apps', 'test', 'tests']);

          const generated: string[] = [];
          const lines: string[] = [`# 🏗️ Init Deep Results`, ""];

          function scanAndGenerate(dirPath: string, depth: number): void {
            if (depth > maxDepth) return;
            try {
              const entries = readDir(dirPath, { withFileTypes: true });
              const files = entries.filter(e => e.isFile() && !e.name.startsWith('.')).map(e => e.name);
              const subdirs = entries.filter(e => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.')).map(e => e.name);
              const dirName = baseName(dirPath);

              if (depth === 0 || SIGNIFICANT.has(dirName.toLowerCase())) {
                const rel = relPath(rootPath, dirPath) || '.';
                const content = depth === 0
                  ? `# ${baseName(rootPath)} — Project Overview\n\n_Auto-generated by omocs init-deep_\n\n## Files\n${files.map(f => `- ${f}`).join('\n')}\n\n## Directories\n${subdirs.map(d => `- ${d}/`).join('\n')}\n`
                  : `# ${dirName}/\n\n## Key Files\n${files.map(f => `- ${f}`).join('\n')}\n`;

                const agentsPath = pathJoin(dirPath, 'AGENTS.md');
                if (!dryRun) {
                  writeFile(agentsPath, content);
                }
                generated.push(rel === '.' ? 'AGENTS.md' : `${rel}/AGENTS.md`);
              }

              for (const sub of subdirs) {
                scanAndGenerate(pathJoin(dirPath, sub), depth + 1);
              }
            } catch {}
          }

          scanAndGenerate(rootPath, 0);

          lines.push(`Generated ${generated.length} AGENTS.md file(s)${dryRun ? ' (dry run — no files written)' : ''}:`);
          lines.push("");
          for (const g of generated) {
            lines.push(`- ✅ ${g}`);
          }

          return lines.join("\n");
        },
      }),

      // ═══════════════════════════════════════════════════════════════
      // 12. Check — comment quality checker
      // ═══════════════════════════════════════════════════════════════
      omocs_check: tool({
        description: "Scan source files for AI-generated comment patterns and low-quality comments. Detects obvious/redundant comments, vague TODOs, AI attribution, unexplained eslint-disable, and commented-out code.",
        args: {
          path: tool.schema.string().optional().describe("Directory to scan (default: current directory)"),
          severity: tool.schema.string().optional().describe("Minimum severity: low, medium, high (default: low)"),
          fix: tool.schema.boolean().optional().describe("Remove fixable AI slop comments"),
        },
        async execute(args, context) {
          const { existsSync: exists, readdirSync: readDir, readFileSync: readFile, writeFileSync: writeFile } = await import("fs");
          const { join: pathJoin, relative: relPath } = await import("path");

          const scanPath = args.path ? pathJoin(context.directory, args.path) : context.directory;
          const minSeverity = args.severity || "low";
          const doFix = args.fix || false;

          if (!exists(scanPath)) return `❌ Directory not found: ${scanPath}`;

          const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', 'coverage', 'vendor']);
          const EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'py', 'rb', 'go', 'rs', 'java', 'php', 'vue', 'svelte']);

          interface Pattern { id: string; name: string; severity: string; regex: RegExp; fixable: boolean; }
          const patterns: Pattern[] = [
            { id: 'obvious', name: 'Obvious comment', severity: 'medium', regex: /^\s*\/\/\s*This (?:function|method|class) (?:does|is|will|handles|returns)/i, fixable: true },
            { id: 'vague-todo', name: 'Vague TODO', severity: 'medium', regex: /^\s*\/\/\s*TODO:?\s*(?:implement|fix|add)?\.?\s*$/i, fixable: false },
            { id: 'ai-attr', name: 'AI attribution', severity: 'high', regex: /^\s*(?:\/\/|#)\s*(?:Added|Generated|Created|Written)\s*(?:by|via|using)\s*(?:AI|ChatGPT|Claude|Copilot|GPT|LLM|Cursor)/i, fixable: true },
            { id: 'eslint-no-reason', name: 'Unexplained eslint-disable', severity: 'high', regex: /^\s*\/\/\s*eslint-disable(?:-next-line)?(?:\s+[\w\/@-]+)?\s*$/, fixable: false },
            { id: 'ts-ignore', name: 'Bare @ts-ignore', severity: 'high', regex: /^\s*\/\/\s*@ts-ignore\s*$/, fixable: false },
            { id: 'commented-code', name: 'Commented-out code', severity: 'low', regex: /^\s*\/\/\s*(?:const|let|var|function|class|import|export|if|return|async)\s/, fixable: true },
          ];

          const sevOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
          const minLevel = sevOrder[minSeverity] || 0;

          interface Finding { file: string; line: number; content: string; pattern: Pattern; }
          const findings: Finding[] = [];

          function walk(dir: string): void {
            try {
              for (const entry of readDir(dir, { withFileTypes: true })) {
                if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
                const full = pathJoin(dir, entry.name);
                if (entry.isDirectory()) { walk(full); continue; }
                const ext = entry.name.split('.').pop()?.toLowerCase() || '';
                if (!EXTS.has(ext)) continue;
                try {
                  const lines = readFile(full, 'utf-8').split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    for (const p of patterns) {
                      if (sevOrder[p.severity] >= minLevel && p.regex.test(lines[i])) {
                        findings.push({ file: relPath(scanPath, full), line: i + 1, content: lines[i].trim(), pattern: p });
                        break;
                      }
                    }
                  }
                } catch {}
              }
            } catch {}
          }

          walk(scanPath);

          if (findings.length === 0) {
            return "✨ No comment quality issues found!";
          }

          const lines: string[] = [`# 🔍 Comment Quality Report`, "", `Found **${findings.length}** issue(s)`, ""];

          // Group by severity
          for (const sev of ['high', 'medium', 'low']) {
            const sevFindings = findings.filter(f => f.pattern.severity === sev);
            if (sevFindings.length === 0) continue;
            const icon = { high: '🔴', medium: '🟡', low: '⚪' }[sev] || '•';
            lines.push(`## ${icon} ${sev.charAt(0).toUpperCase() + sev.slice(1)} (${sevFindings.length})`);
            lines.push("");
            for (const f of sevFindings.slice(0, 20)) {
              lines.push(`- **${f.file}:${f.line}** — ${f.pattern.name}`);
              lines.push(`  \`${f.content.slice(0, 80)}\``);
            }
            if (sevFindings.length > 20) lines.push(`- ...and ${sevFindings.length - 20} more`);
            lines.push("");
          }

          // Fix
          if (doFix) {
            const fixable = findings.filter(f => f.pattern.fixable);
            if (fixable.length > 0) {
              const byFile = new Map<string, Set<number>>();
              for (const f of fixable) {
                const full = pathJoin(scanPath, f.file);
                if (!byFile.has(full)) byFile.set(full, new Set());
                byFile.get(full)!.add(f.line - 1);
              }
              let totalFixed = 0;
              for (const [filePath, lineNums] of byFile) {
                try {
                  const content = readFile(filePath, 'utf-8').split('\n');
                  const newContent = content.filter((_, i) => !lineNums.has(i));
                  writeFile(filePath, newContent.join('\n'));
                  totalFixed += lineNums.size;
                } catch {}
              }
              lines.push(`## 🔧 Fixed`);
              lines.push(`Removed ${totalFixed} fixable comment(s) from ${byFile.size} file(s).`);
            }
          } else {
            const fixableCount = findings.filter(f => f.pattern.fixable).length;
            if (fixableCount > 0) {
              lines.push(`💡 ${fixableCount} issues are auto-fixable. Run \`omocs check --fix\` to remove them.`);
            }
          }

          return lines.join("\n");
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
        `- Launchboard: omocs_task_list, omocs_task_create, omocs_task_update, omocs_task_move\n` +
        `- Project setup: omocs_init_deep (generate AGENTS.md hierarchy)\n` +
        `- Code quality: omocs_check (scan for AI slop comments)\n` +
        `\n` +
        `OMO Suites has 13 profiles (vs OCS's 8), 28 agents, 67 task categories, 11 MCP servers, 10 LSP configs, and Launchboard integration.`
      );
    },
  };
};

export default OmoSuitesPlugin;
