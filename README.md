```
   ██████╗ ███╗   ███╗ ██████╗     ███████╗██╗   ██╗██╗████████╗███████╗███████╗
  ██╔═══██╗████╗ ████║██╔═══██╗    ██╔════╝██║   ██║██║╚══██╔══╝██╔════╝██╔════╝
  ██║   ██║██╔████╔██║██║   ██║    ███████╗██║   ██║██║   ██║   █████╗  ███████╗
  ██║   ██║██║╚██╔╝██║██║   ██║    ╚════██║██║   ██║██║   ██║   ██╔══╝  ╚════██║
  ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝    ███████║╚██████╔╝██║   ██║   ███████╗███████║
   ╚═════╝ ╚═╝     ╚═╝ ╚═════╝     ╚══════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝╚══════╝
```

# OMO Suites

**The open-source OpenCode power toolkit. More profiles. More tools. Zero cost.**

Multi-model orchestration, smart agent routing, profile switching, MCP/LSP management — as an [OpenCode](https://github.com/opencode-ai/opencode) plugin or standalone CLI.

## Installation

### Quick Install (npm)

```bash
npm install -g omo-suites
omocs init
```

### For Humans

Copy and paste this prompt to your LLM agent (Claude Code, OpenCode, Cursor, AmpCode, etc.):

```
Install and configure OMO Suites by following the instructions here:
https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/docs/installation.md
```

### For LLM Agents

```bash
curl -s https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/docs/installation.md
```

### Manual (from source)

```bash
curl -fsSL https://raw.githubusercontent.com/TheFahmi/omocs/main/install.sh | bash
```

→ [Full installation guide](docs/installation.md)

## What You Get

- **13 Profiles** — [→ docs/profiles.md](docs/profiles.md)
  Pre-built model configurations across 4 scope types: all, lead, mixed, and economy.

- **28 Agents** — [→ docs/agents.md](docs/agents.md)
  Specialized AI roles with tuned models, thinking budgets, and automatic task routing across 67 categories.

- **12 Plugin Tools** — [→ docs/plugin.md](docs/plugin.md)
  Drop-in OpenCode plugin with system prompt injection — agents use tools automatically.

- **11 MCP Servers** — [→ docs/mcp.md](docs/mcp.md)
  One-click install for Postgres, Redis, Brave Search, Docker, Sentry, and more.

- **10 LSP Configs** — [→ docs/lsp.md](docs/lsp.md)
  Auto-detect your project stack and install the right language servers.

- **Full CLI** — [→ docs/cli.md](docs/cli.md)
  Profiles, agents, accounts, MCP, LSP, stats — all from the command line.

## Quick Start

```bash
omocs init                      # Setup wizard
omocs profile use ultra-mixed   # Best model for every task
omocs agent route debugging     # See which agent handles what
omocs doctor                    # Verify everything works
```

## 🚀 Launchboard

AI-integrated Kanban board included with OMO Suites. Plan. Build. Launch.

```bash
omocs launchboard setup   # First-time setup
omocs launchboard start   # Start the board
omocs launchboard status  # Check status
omocs lb status           # Shorthand alias
```

Backend: http://localhost:3030 | Frontend: http://localhost:3040

## Requirements

- Node.js >= 18 (for npm install) or [Bun](https://bun.sh) (for source install)
- [OpenCode](https://github.com/opencode-ai/opencode)
- At least one AI provider API key

## License

MIT
