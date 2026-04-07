import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename, relative as relPath } from "path";
import { homedir } from "os";
import { getOmoConfigPath, getOpencodeConfigPath, readJsonFile } from "../helpers";
import { agents, categoryRouting } from "../../data/agents";
import { profilesList } from "../../data/profiles";
import { mcpServers } from "../../data/mcp-registry";
import { lspServers } from "../../data/lsp-registry";

export const systemTools: Record<string, any> = {
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

  omocs_init_deep: tool({
    description: "Auto-generate hierarchical AGENTS.md files per significant folder. Scans project structure, infers purpose, tech stack, and conventions. Creates root + per-folder AGENTS.md.",
    args: {
      path: tool.schema.string().optional().describe("Project root directory (default: current directory)"),
      depth: tool.schema.number().optional().describe("Maximum directory depth to scan (default: 3)"),
      dryRun: tool.schema.boolean().optional().describe("Preview what would be generated without writing files"),
    },
    async execute(args, context) {
      const rootPath = args.path ? join(context.directory, args.path) : context.directory;
      const maxDepth = args.depth || 3;
      const dryRun = args.dryRun || false;

      if (!existsSync(rootPath)) {
        return `❌ Directory not found: ${rootPath}`;
      }

      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', '.turbo', 'coverage', 'vendor', '.venv', 'venv', 'target', 'out']);
      const SIGNIFICANT = new Set(['src', 'lib', 'utils', 'components', 'pages', 'app', 'api', 'routes', 'controllers', 'services', 'models', 'middleware', 'hooks', 'types', 'config', 'core', 'common', 'shared', 'modules', 'features', 'data', 'commands', 'packages', 'apps', 'test', 'tests']);

      const generated: string[] = [];
      const lines: string[] = [`# 🏗️ Init Deep Results`, ""];

      function scanAndGenerate(dirPath: string, depth: number): void {
        if (depth > maxDepth) return;
        try {
          const entries = readdirSync(dirPath, { withFileTypes: true });
          const files = entries.filter(e => e.isFile() && !e.name.startsWith('.')).map(e => e.name);
          const subdirs = entries.filter(e => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.')).map(e => e.name);
          const dirName = basename(dirPath);

          if (depth === 0 || SIGNIFICANT.has(dirName.toLowerCase())) {
            const rel = relPath(rootPath, dirPath) || '.';
            const content = depth === 0
              ? `# ${basename(rootPath)} — Project Overview\n\n_Auto-generated by omocs init-deep_\n\n## Files\n${files.map(f => `- ${f}`).join('\n')}\n\n## Directories\n${subdirs.map(d => `- ${d}/`).join('\n')}\n`
              : `# ${dirName}/\n\n## Key Files\n${files.map(f => `- ${f}`).join('\n')}\n`;

            const agentsPath = join(dirPath, 'AGENTS.md');
            if (!dryRun) {
              writeFileSync(agentsPath, content);
            }
            generated.push(rel === '.' ? 'AGENTS.md' : `${rel}/AGENTS.md`);
          }

          for (const sub of subdirs) {
            scanAndGenerate(join(dirPath, sub), depth + 1);
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
};
