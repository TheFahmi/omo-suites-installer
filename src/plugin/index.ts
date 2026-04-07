import type { Plugin } from "@opencode-ai/plugin";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

import { trackEvent } from "../utils/telemetry.ts";

// Tool group imports
import { profileTools } from "./tools/profile";
import { agentTools } from "./tools/agent";
import { mcpTools } from "./tools/mcp";
import { lspTools } from "./tools/lsp";
import { configTools } from "./tools/config";
import { launchboardTools } from "./tools/launchboard";
import { codeReviewTools } from "./tools/code-review";
import { systemTools } from "./tools/system";

// ─── Version Detection ───────────────────────────────────────────────

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

const OmoSuitesPlugin: Plugin = async (ctx) => {
  trackEvent("plugin_loaded", { plugin: "omo-suites", status: "success" });
  console.log(`[OMO Suites] v${PLUGIN_VERSION} loaded`);

  // Check for updates on plugin load (OpenCode startup)
  checkPluginUpdate();

  return {
    tool: {
      // Profile tools
      ...profileTools,
      // Agent tools
      ...agentTools,
      // MCP tools
      ...mcpTools,
      // LSP tools
      ...lspTools,
      // Config tools
      ...configTools,
      // Launchboard tools
      ...launchboardTools,
      // Code review tools
      ...codeReviewTools,
      // System tools
      ...systemTools,
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
