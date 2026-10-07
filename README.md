```
   ██████╗ ███╗   ███╗ ██████╗     ███████╗██╗   ██╗██╗████████╗███████╗███████╗
  ██╔═══██╗████╗ ████║██╔═══██╗    ██╔════╝██║   ██║██║╚══██╔══╝██╔════╝██╔════╝
  ██║   ██║██╔████╔██║██║   ██║    ███████╗██║   ██║██║   ██║   █████╗  ███████╗
  ██║   ██║██║╚██╔╝██║██║   ██║    ╚════██║██║   ██║██║   ██║   ██╔══╝  ╚════██║
  ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝    ███████║╚██████╔╝██║   ██║   ███████╗███████║
   ╚═════╝ ╚═╝     ╚═╝ ╚═════╝     ╚══════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝╚══════╝
```

<p align="center">
  <a href="https://www.npmjs.com/package/omo-suites"><img src="https://img.shields.io/npm/v/omo-suites.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/omo-suites"><img src="https://img.shields.io/npm/dm/omo-suites.svg" alt="NPM Downloads" /></a>
  <a href="https://www.npmjs.com/package/omo-suites"><img src="https://img.shields.io/npm/l/omo-suites.svg" alt="License" /></a>
  <a href="https://github.com/TheFahmi/omo-suites-installer/actions/workflows/ci.yml"><img src="https://github.com/TheFahmi/omo-suites-installer/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/TheFahmi/omo-suites-installer"><img src="https://img.shields.io/github/stars/TheFahmi/omo-suites-installer.svg?style=social" alt="GitHub Stars" /></a>
  <a href="https://www.npmjs.com/package/omo-suites"><img src="https://img.shields.io/node/v/omo-suites.svg" alt="Node Version" /></a>
</p>

# OMO Suites

**OpenCode plugin + CLI toolkit. Multi-model orchestration, smart agent routing, and developer workflow automation.**

OMO Suites supercharges [OpenCode](https://github.com/opencode-ai/opencode) with profiles, agent routing, MCP/LSP management, diagnostics, and more — as a drop-in plugin or standalone CLI.

## Installation

```bash
npm install -g omo-suites
omocs init
```

> **Requires:** Node.js >= 18 and [OpenCode](https://github.com/opencode-ai/opencode)

### Alternative: Agent-Assisted Install

Paste this to your LLM agent (Claude Code, Cursor, etc.):

```
Install and configure OMO Suites by following:
https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/docs/installation.md
```

## Quick Start

```bash
omocs init                      # Interactive setup wizard
omocs profile use ultra-mixed   # Switch model profile
omocs agent route debugging     # See which agent handles a task
omocs doctor                    # Health check your setup
omocs init-deep                 # Generate AGENTS.md hierarchy
omocs cost opus-4.6-all         # Estimate costs per profile
omocs check                     # Scan for AI slop comments
omocs plan                      # Structured planning before coding
```

## Features

- **Multi-Model Orchestration & Profiles** — 13 pre-built profiles across 4 scope types (all, lead, mixed, economy). Switch with one command.
- **Agent Routing** — 28 specialized agents across 67 task categories. Automatic routing to the best agent for each task.
- **MCP/LSP Management** — One-click install for 11 MCP servers (Postgres, Redis, Brave Search, Docker, etc.) and 10 LSP configs with auto-detection.
- **Config Validation & Safe Editing** — Strict config validation, import/export, and template management.
- **Code Review & Linting** — Scan source for AI-generated comment patterns and low-quality code.
- **Launchboard** — AI-integrated Kanban board for task management. Plan. Build. Launch.
- **Shell Completion** — Full completion scripts for bash, zsh, and fish.
- **Self-Update with Rollback** — Safe update flow with automatic backup and rollback on failure.
- **Doctor & Diagnostics** — Comprehensive health checks, smoke tests, and auto-diagnostics.
- **Telemetry** — Opt-in usage telemetry for improving the toolkit.
- **Plugin System** — Drop-in OpenCode plugin with 12 tools and system prompt injection.
- **Session & Memory** — Browse OpenCode sessions and manage persistent per-workspace notes.
- **Marketplace** — Browse, install, and manage community plugins.

## Commands

| Command | Description |
|---------|-------------|
| `omocs init` | Interactive setup wizard |
| `omocs init-deep` | Auto-generate hierarchical AGENTS.md per folder |
| `omocs profile` | Manage model profiles (list, use, create, export, import) |
| `omocs agent` | Manage agent roles (list, use, create, info, route) |
| `omocs account` | Manage API provider accounts (add, remove, rotate, status) |
| `omocs mcp` | MCP server management (list, install, remove) |
| `omocs mcp-status` | Health check all configured MCP servers |
| `omocs lsp` | LSP server management (detect, install, status) |
| `omocs config` | Manage configuration (validate, telemetry) |
| `omocs doctor` | Diagnose your OpenCode setup |
| `omocs status` | Show current configuration and provider status |
| `omocs stats` | Token usage statistics and analytics dashboard |
| `omocs cost` | Estimate cost per hour/day based on profile |
| `omocs diff` | Compare two profiles side-by-side |
| `omocs check` | Scan source files for AI slop comments |
| `omocs plan` | Prometheus-style structured planning before coding |
| `omocs key` | Manage 1mr.tech API keys (set, status) |
| `omocs fallback` | View and edit model fallback chains |
| `omocs launchboard` | Manage Launchboard Kanban board (setup, start, status) |
| `omocs memory` | Workspace memory notes (add, show, search, remove) |
| `omocs session` | Browse and search OpenCode sessions |
| `omocs squad` | Launch and manage parallel OpenCode agent instances |
| `omocs template` | Save, load, and share config templates |
| `omocs bootstrap` | Scaffold a new workspace with predefined templates |
| `omocs completion` | Generate shell completion scripts (bash, zsh, fish) |
| `omocs compact` | Clean up config, memory, indexes, and stats data |
| `omocs auto` | Manage automatic background checks |
| `omocs benchmark` | Quick model comparison — same prompt to multiple models |
| `omocs watch` | Watch project structure and auto-regenerate AGENTS.md |
| `omocs worktree` | Git worktree management for task isolation |
| `omocs export` | Export all config to a single JSON file |
| `omocs import` | Import config from an exported JSON file |
| `omocs test-smoke` | Run light smoke test for core integration |
| `omocs marketplace` | Browse and manage community plugins |

> **Alias:** `omo` works anywhere `omocs` does.

## Plugin Usage

OMO Suites works as a drop-in [OpenCode plugin](https://github.com/opencode-ai/opencode), giving your agents 12 tools they can call directly.

Add to your `opencode.json`:

```json
{
  "plugins": {
    "omocs": {
      "source": "npm:omo-suites"
    }
  }
}
```

**Plugin tools available to agents:**

| Tool | Description |
|------|-------------|
| `omocs_profile_list` | List all profiles with models and scope types |
| `omocs_profile_switch` | Switch profile — updates agents, categories, configs |
| `omocs_agent_list` | List all agents with models and thinking budgets |
| `omocs_agent_info` | Get detailed agent info (model, budget, tools, tags) |
| `omocs_agent_route` | Route a task category to the best agent |
| `omocs_categories` | List all task categories and routing |
| `omocs_mcp_list` | List available MCP servers |
| `omocs_mcp_install` | Install + auto-configure an MCP server |
| `omocs_lsp_detect` | Scan project and suggest LSP servers |
| `omocs_doctor` | Run comprehensive health check |
| `omocs_account_status` | Check API key status and provider health |
| `omocs_config_get` | View current configuration |

## Launchboard

AI-integrated Kanban board included with OMO Suites.

```bash
omocs launchboard setup   # First-time setup
omocs launchboard start   # Start the board
omocs launchboard status  # Check status
omocs lb status           # Shorthand alias
```

Backend: `http://localhost:3030` | Frontend: `http://localhost:3040`

## Configuration

Config lives at `~/.omocs/config.json`. Manage it with:

```bash
omocs config validate     # Check config syntax and structure
omocs config telemetry    # Manage telemetry settings
omocs export              # Export all config to JSON
omocs import config.json  # Import from exported file
omocs template save my-setup  # Save as reusable template
```

## Documentation

- [Installation Guide](docs/installation.md)
- [Profiles](docs/profiles.md) — 13 pre-built model configurations
- [Agents](docs/agents.md) — 28 specialized agent roles
- [Plugin Tools](docs/plugin.md) — 12 OpenCode plugin tools
- [MCP Servers](docs/mcp.md) — 11 supported MCP servers
- [LSP Configs](docs/lsp.md) — 10 language server configurations
- [CLI Reference](docs/cli.md) — Full command documentation
- [API Reference](docs/API.md) — Config schema, plugin API, environment variables

## License

[MIT](LICENSE) © TheFahmi


<!-- Security scan triggered at 2026-10-07 11:40:32 -->