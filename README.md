```
  ╔═╗╔╦╗╔═╗  ╔═╗┬ ┬┬┌┬┐┌─┐┌─┐
  ║ ║║║║║ ║  ╚═╗│ ││ │ ├┤ └─┐
  ╚═╝╩ ╩╚═╝  ╚═╝└─┘┴ ┴ └─┘└─┘
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

omocs agent list        # Show 15 pre-configured agent roles
omocs agent use momus   # Switch active agent role
omocs agent info atlas  # Agent details + system prompt
omocs agent categories  # List all 32 task categories
omocs agent route debug # Which agent handles this category?

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

| Profile | Primary Model | Review/Secondary | Use Case |
|---------|--------------|-------------------|----------|
| **power** | Claude Opus 4.6 Thinking | GPT-5.3 Codex | Complex tasks, big refactors |
| **balanced** | Claude Opus 4.6 Thinking | Claude Sonnet 4.6 | Daily driver |
| **economy** | Claude Sonnet 4.6 | Claude Sonnet 4.6 | Token-conscious work |
| **gemini** | Gemini 3.1 Pro High | Gemini 3.1 Pro High | Heavy reasoning, large context |
| **hybrid** | Claude Opus 4.6 Thinking | Gemini 3.1 Pro High (frontend), Sonnet 4.6 (quick) | Multi-model routing |
| **local** | Ollama DeepSeek Coder v3 | Ollama DeepSeek Coder v3 | Free tier, zero cost |

```bash
# Morning: economy mode for routine stuff
omocs profile use economy

# Afternoon: big refactor needs the big guns
omocs profile use power
```

## Agent Roles

15 specialized agents with tuned system prompts, model assignments, and thinking budgets. Each one knows its job.

| Agent | Model | Budget | Good For |
|-------|-------|--------|----------|
| Atlas | Claude Opus 4.6 | 20K | Breaking down large tasks |
| Sisyphus | Claude Opus 4.6 | 16K | Writing code, following patterns |
| Prometheus | Claude Opus 4.6 | 40K | Requirements, work plans |
| Metis | Claude Opus 4.6 | 32K | Finding edge cases, hidden requirements |
| Momus | GPT-5.3 Codex | 40K | Merciless code review |
| Hephaestus | GPT-5.3 Codex | 50K | Large-scale refactoring |
| Oracle | GPT-5.3 Codex | 32K | Architecture decisions |
| Librarian | Claude Sonnet 4.6 | 8K | Finding docs, examples |
| Explore | Claude Sonnet 4.6 | 10K | Mapping new codebases |
| Multimodal Looker | Claude Sonnet 4.6 | 15K | Visual analysis, screenshots |
| Frontend UI/UX | Gemini 3.1 Pro High | 20K | UI/UX, accessibility, web games |
| Architect | Claude Opus 4.6 | 40K | System design, API design |
| Database Expert | Claude Opus 4.6 | 32K | Schema, queries, migrations |
| DevRel | Kimi K2.5 | 20K | Docs, writing, research |
| Image Generator | GLM Image | — | Image generation |

```bash
# Need a code review? Switch agent.
omocs agent use momus

# Exploring a new codebase?
omocs agent use explore

# Check which agent handles a task category
omocs agent route debugging
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
  postgres      PostgreSQL database access
  fetch         HTTP fetch for web content
  filesystem    File system operations
  brave-search  Web search via Brave
  slack         Slack workspace integration
  redis         Redis cache/store access
  docker        Docker container management
  sentry        Error tracking via Sentry
  context7      Library documentation search
  grep-app      Code search via grep.app
  exa-websearch AI-powered web search via Exa

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
