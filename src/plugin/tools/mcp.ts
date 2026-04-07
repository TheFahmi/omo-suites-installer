import { tool } from "@opencode-ai/plugin/tool";
import { formatMcpList, getOpencodeConfigPath, readJsonFile, writeJsonFile } from "../helpers";
import { listMcpKeys, getMcpServer } from "../../data/mcp-registry";

export const mcpTools: Record<string, any> = {
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
};
