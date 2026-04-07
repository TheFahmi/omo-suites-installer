import { existsSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";

// ─── Config Helpers ──────────────────────────────────────────────────

export function getOmoConfigPath(directory?: string): string {
  const localPath = join(directory || process.cwd(), ".opencode", "oh-my-opencode.json");
  const globalPath = join(homedir(), ".config", "opencode", "oh-my-opencode.json");
  return existsSync(localPath) ? localPath : globalPath;
}

export function getOpencodeConfigPath(directory?: string): string {
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

export function readJsonFile(path: string): any {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export function writeJsonFile(path: string, data: any): void {
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

import { agents, categoryRouting } from "../data/agents";
import { profilesList } from "../data/profiles";
import { mcpServers } from "../data/mcp-registry";

export function formatProfileList(): string {
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

export function formatAgentList(): string {
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

export function formatMcpList(): string {
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

export function formatCategoryList(): string {
  const lines: string[] = ["# Task Category Routing (67 categories)", ""];

  for (const [category, agentId] of Object.entries(categoryRouting)) {
    const agent = agents[agentId];
    lines.push(`• **${category}** → ${agent?.emoji || "?"} ${agent?.name || agentId}`);
  }

  return lines.join("\n");
}
