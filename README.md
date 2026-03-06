```
   ____  __  __  ____     ____        _ __
  / __ \/ / / / / __ \   / __/__  __ (_) /____  ___
 / /_/ / /_/ / / /_/ /   _\ \/ / / / / / __/ -_|_-<
 \____/\__,_/  \____/   /___/\_,_/ /_/\__/\__/___/
```

# OMO Suites

Config toolkit for [OpenCode](https://github.com/opencode-ai/opencode). Manage accounts, profiles, agents, LSPs, and MCP tools from one CLI.

## The problem

You use OpenCode daily. You have API keys scattered across env vars. You manually edit `.opencode.json` every time you want to switch models. You forget which LSP servers you need for each project. You have no idea how many tokens you burned last week.

OMO Suites fixes all of that.

## Install

```bash
# One-liner
curl -fsSL https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/install.sh | bash

# Or manually
git clone https://github.com/TheFahmi/omo-suites-installer.git ~/.omocs
cd ~/.omocs && bun install && bun link
```

Requires [Bun](https://bun.sh). The installer handles that if you don't have it.

## Commands

```bash
omocs init              # Interactive setup wizard
omocs doctor            # Check if everything works

omocs account add       # Add API key (encrypted storage)
omocs account list      # Show all accounts + status
omocs account rotate    # Switch to next available key
omocs account check     # Verify key health

omocs profile list      # Show available profiles
omocs profile use power # Switch to a profile
omocs profile create    # Build a custom profile
omocs profile export    # Share profile as JSON

omocs agent list        # Show 14 pre-configured agent roles
omocs agent use momus   # Switch active agent role
omocs agent info atlas  # Agent details + system prompt

omocs lsp detect        # Scan project, suggest LSP servers
omocs lsp install       # Install detected LSP servers
omocs lsp status        # Check what's installed

omocs mcp list          # Available MCP tools
omocs mcp install ctx7  # Install + auto-configure
omocs mcp remove        # Remove MCP server

omocs stats             # Token usage summary
omocs stats today       # Today's usage
omocs stats export csv  # Export to CSV
```

## Profiles

Switch your entire OpenCode config in one command.

| Profile | Coder Model | Task Model | Use Case |
|---------|------------|------------|----------|
| **power** | Claude 4 Opus | Claude 4 Opus | Complex tasks, big refactors |
| **balanced** | Claude 4 Sonnet | Claude 4 Sonnet | Daily driver |
| **economy** | Gemini 2.5 Flash | Gemini 2.5 Flash | Token-conscious work |
| **gemini** | Gemini 2.5 Pro | Gemini 2.5 Pro | Heavy reasoning, large context |
| **hybrid** | Claude 4 Sonnet | Gemini 2.5 Flash | Smart: premium for code, cheap for tasks |
| **local** | Copilot Claude | Copilot GPT-4o | Free tier, zero cost |

```bash
# Morning: economy mode for routine stuff
omocs profile use economy

# Afternoon: big refactor needs the big guns
omocs profile use power
```

## Agent Roles

14 specialized agents with tuned system prompts. Each one knows its job.

| Agent | Role | Good For |
|-------|------|----------|
| Atlas | Orchestrator | Breaking down large tasks |
| Sisyphus | Implementer | Writing code, following patterns |
| Prometheus | Planner | Requirements, work plans |
| Metis | Gap Analyst | Finding edge cases, hidden requirements |
| Momus | Code Reviewer | Merciless code review |
| Hephaestus | Deep Worker | Large-scale refactoring |
| Oracle | Advisor | Architecture decisions |
| Librarian | Researcher | Finding docs, examples |
| Explorer | Discovery | Mapping new codebases |
| SecurityAuditor | Security | OWASP, vulnerabilities |
| PerformanceProfiler | Performance | Bottlenecks, optimization |
| DatabaseExpert | Database | Schema, queries, migrations |
| FrontendSpecialist | Frontend | UI/UX, accessibility |
| DevOpsEngineer | DevOps | Docker, CI/CD, deployment |

```bash
# Need a code review? Switch agent.
omocs agent use momus

# Exploring a new codebase?
omocs agent use explorer
```

## Multi-Account

Store multiple API keys per provider. Keys are encrypted (AES-256-GCM) on disk.

```bash
# Add keys
omocs account add anthropic --label "work" --key sk-ant-...
omocs account add anthropic --label "personal" --key sk-ant-...
omocs account add openai --label "main" --key sk-...

# Auto-rotate on rate limit
omocs account rotate

# Check which keys are healthy
omocs account check
```

## LSP Auto-Setup

Detects your project stack and sets up language servers.

```bash
$ omocs lsp detect

Detected stack:
  ✅ TypeScript (package.json, tsconfig.json)
  ✅ Python (pyproject.toml)
  ✅ Docker (Dockerfile)

Suggested LSP servers:
  → typescript-language-server
  → pyright
  → docker-langserver

Run `omocs lsp install` to install all.
```

## MCP Tools

One-click install for popular MCP servers.

```bash
$ omocs mcp list

Available:
  context7      Library documentation search
  github-search Search GitHub repositories
  filesystem    File system operations
  brave-search  Web search via Brave
  sqlite        SQLite database access
  memory        Persistent memory for agents

$ omocs mcp install context7
✅ Installed and configured in .opencode.json
```

## Config

Everything lives in `~/.omocs/`:

```
~/.omocs/
├── config.json      # Accounts, preferences (encrypted keys)
├── profiles/        # Custom profile definitions
├── agents/          # Custom agent role overrides
└── stats.json       # Token usage data
```

OMO Suites never touches your `.opencode.json` without asking. Profile switches write a backup first.

## Requirements

- [Bun](https://bun.sh) runtime
- [OpenCode](https://github.com/opencode-ai/opencode) installed
- At least one AI provider API key

## Contributing

PRs welcome. Keep it simple, keep it useful.

## License

MIT
