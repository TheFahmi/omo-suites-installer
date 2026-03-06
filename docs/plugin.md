# Plugin Mode

When loaded as an OpenCode plugin, OMO Suites gives your agents **12 tools** they can call directly.

## Available Tools

| Tool | Description |
|------|-------------|
| `omocs_profile_list` | List all 13 profiles with models and scope types |
| `omocs_profile_switch` | Switch profile — updates agents, categories, configs |
| `omocs_agent_list` | List all 15 agents with models and thinking budgets |
| `omocs_agent_info` | Get detailed agent info (model, budget, tools, tags) |
| `omocs_agent_route` | Route a task category to the best agent |
| `omocs_categories` | List all 32 task categories and routing |
| `omocs_mcp_list` | List 11 available MCP servers |
| `omocs_mcp_install` | Install + auto-configure an MCP server |
| `omocs_lsp_detect` | Scan project and suggest LSP servers |
| `omocs_doctor` | Run comprehensive health check |
| `omocs_account_status` | Check API key status and provider health |
| `omocs_config_get` | View current configuration |

## Setup

Add to your `opencode.json`:

```json
{
  "plugins": {
    "omocs": {
      "source": "npm:omocs"
    }
  }
}
```

Or from a local clone:

```json
{
  "plugins": {
    "omocs": {
      "source": "local:/path/to/omocs"
    }
  }
}
```

## How Agents Use It

Agents automatically know about these tools via **system prompt injection**. When the plugin loads, it injects instructions into the agent's system prompt so they know:

- What tools are available
- When to use each tool
- How to interpret results

This means agents can proactively use OMO Suites tools without being explicitly told — they'll route tasks, switch profiles, and install MCP servers as needed.

## Example Agent Interactions

```
Agent: "Let me check which profile is active..."
→ calls omocs_profile_list

Agent: "This is a frontend task, let me route it..."
→ calls omocs_agent_route with category "visual-engineering"

Agent: "I need database access for this query..."
→ calls omocs_mcp_install with server "postgres"
```
