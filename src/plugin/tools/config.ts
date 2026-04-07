import { tool } from "@opencode-ai/plugin/tool";
import { getOmoConfigPath, getOpencodeConfigPath, readJsonFile } from "../helpers";
import { formatCategoryList } from "../helpers";

export const configTools: Record<string, any> = {
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

  omocs_categories: tool({
    description: "List all 67 task categories and their agent routing. Shows which agent handles each type of task.",
    args: {},
    async execute() {
      return formatCategoryList();
    },
  }),
};
