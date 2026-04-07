import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { lspServers, listLspKeys } from "../../data/lsp-registry";

export const lspTools = {
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
};
