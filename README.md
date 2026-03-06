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

OpenCode plugin + standalone CLI. Multi-model orchestration, smart agent routing, profile switching, MCP/LSP management — everything you need to get the most out of [OpenCode](https://github.com/opencode-ai/opencode).

## OMO Suites vs OCS (OpenCode Configuration Suites)

| Feature | OMO Suites (Free) | OCS (Paid) |
|---------|-------------------|------------|
| **Price** | **$0 — MIT license** | $29/mo |
| **Profiles** | **13 profiles** | 8 profiles |
| **Scope types** | **4 (all, lead, mixed, economy)** | 2 |
| **Agents** | **15 specialized agents** | 6 |
| **Task categories** | **32 categories** | 12 |
| **Agent routing** | **✅ Category → Agent** | ❌ |
| **MCP registry** | **11 servers** | 5 |
| **LSP registry** | **10 servers** | 4 |
| **Auto LSP detect** | **✅ Stack scanning** | ❌ |
| **OpenCode plugin** | **✅ Native plugin** | ✅ |
| **CLI standalone** | **✅ Full CLI** | ❌ Plugin only |
| **System prompt injection** | **✅ Agent awareness** | ✅ |
| **Custom profiles** | **✅ Create + export/import** | ✅ |
| **Account management** | **✅ Encrypted key rotation** | ❌ |
| **Health check (doctor)** | **✅ 10-point diagnostic** | ❌ |
| **Kimi K2.5 support** | **✅** | ❌ |
| **Ollama/local models** | **✅** | ❌ |
| **Budget profiles** | **✅** | ❌ |

**OMO Suites beats OCS on every metric — for free.**

---

## Install

### As OpenCode Plugin

```bash
# Add to your opencode.json
{
  "plugins": {
    "omocs": {
      "source": "npm:omocs"
    }
  }
}
```

Or install from Git:
```bash
git clone https://github.com/TheFahmi/omocs.git
cd omocs && bun install && bun run build
```

Then in `opencode.json`:
```json
{
  "plugins": {
    "omocs": {
      "source": "local:/path/to/omocs"
    }
  }
}
```

### As Standalone CLI

```bash
# One-liner
curl -fsSL https://raw.githubusercontent.com/TheFahmi/omocs/main/install.sh | bash

# Or manually
git clone https://github.com/TheFahmi/omocs.git ~/.omocs
cd ~/.omocs && bun install && bun link
```

Requires [Bun](https://bun.sh). The installer handles that if you don't have it.

---

## Plugin Mode — 12 Tools for OpenCode Agents

When loaded as a plugin, OMO Suites gives your OpenCode agents these tools:

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

Agents automatically know about these tools via system prompt injection.

---

## CLI Mode — Full Command Suite

```bash
omocs init              # Interactive setup wizard
omocs doctor            # Check if everything works

omocs account add       # Add API key (encrypted storage)
omocs account list      # Show all accounts + status
omocs account rotate    # Switch to next available key
omocs account check     # Verify key health

omocs profile list      # Show all 13 profiles
omocs profile use ultra-mixed   # Switch profile
omocs profile create    # Build a custom profile
omocs profile export    # Share profile as JSON

omocs agent list        # Show 15 agent roles
omocs agent use momus   # Switch active agent
omocs agent info atlas  # Agent details + system prompt
omocs agent categories  # List all 32 task categories
omocs agent route debug # Which agent handles this?

omocs lsp detect        # Scan project, suggest LSP servers
omocs lsp install       # Install detected LSP servers

omocs mcp list          # Available MCP tools
omocs mcp install ctx7  # Install + auto-configure

omocs stats             # Token usage summary
```

---

## 13 Profiles — 4 Scope Types

### 🌐 All Scope — Every agent uses same model
| Profile | Model | Best For |
|---------|-------|----------|
| **opus-4.6-all** | Claude Opus 4.6 | Maximum quality, complex tasks |
| **codex-5.3-all** | GPT-5.3 Codex | OpenAI-focused workflows |
| **gemini-3-all** | Gemini 3.1 Pro + Flash | Google ecosystem, large context |
| **sonnet-4.6-all** | Claude Sonnet 4.6 | Balanced cost/quality |
| **kimi-k2.5-all** | Kimi K2.5 | Ultra cheap, Claude-like |

### 👑 Lead Scope — Primary for leaders, cheaper for workers
| Profile | Lead Model | Worker Model | Best For |
|---------|------------|--------------|----------|
| **opus-4.6-lead** | Opus 4.6 | Sonnet + Gemini + Codex | Premium lead, budget workers |
| **sonnet-4.6-lead** | Sonnet 4.6 | Gemini + Flash | Mid-cost lead + cheap workers |

### 🔀 Mixed Scope — Best model per role
| Profile | Models | Best For |
|---------|--------|----------|
| **codex-5.3-hybrid** | Codex + Gemini + Flash + Sonnet | Multi-provider diversity |
| **codex-5.3-gemini** | Codex + Gemini Pro + Flash | OpenAI + Google duo |
| **codex-5.3-sonnet** | Codex + Sonnet 4.6 | OpenAI + Anthropic duo |
| **ultra-mixed** | Opus + Codex + Gemini + Sonnet + Kimi | **Best possible per task** |

### 💰 Economy Scope — Cheapest viable models
| Profile | Models | Best For |
|---------|--------|----------|
| **budget-mixed** | Sonnet + Flash + Kimi | Minimal cost, still functional |
| **local-free** | Ollama DeepSeek Coder v3 | Zero cost, fully offline |

---

## 15 Agents — 32 Task Categories

| Agent | Emoji | Model | Budget | Specialization |
|-------|-------|-------|--------|----------------|
| **Sisyphus** | 🔨 | Claude Opus 4.6 | 16K | Implementation, code writing |
| **Atlas** | 🗺️ | Claude Opus 4.6 | 20K | Task orchestration, delegation |
| **Prometheus** | 🔥 | Claude Opus 4.6 | 40K | Planning, requirements |
| **Metis** | 🧠 | Claude Opus 4.6 | 32K | Gap analysis, edge cases |
| **Momus** | 👁️ | GPT-5.3 Codex | 40K | Code review, quality |
| **Oracle** | 🔮 | GPT-5.3 Codex | 32K | Architecture decisions |
| **Hephaestus** | ⚒️ | GPT-5.3 Codex | 50K | Deep refactoring |
| **Librarian** | 📚 | Claude Sonnet 4.6 | 8K | Search, documentation |
| **Explore** | 🧭 | Claude Sonnet 4.6 | 10K | Codebase discovery |
| **Multimodal Looker** | 👀 | Claude Sonnet 4.6 | 15K | Visual analysis |
| **Frontend UI/UX** | 🎨 | Gemini 3.1 Pro | 20K | UI/UX, accessibility |
| **Architect** | 🏗️ | Claude Opus 4.6 | 40K | System design |
| **Database Expert** | 🗃️ | Claude Opus 4.6 | 32K | Queries, migrations |
| **DevRel** | 🚀 | Kimi K2.5 | 20K | Docs, writing |
| **Image Generator** | 🖼️ | GLM Image | — | Image generation |

### Category Routing

Each task category automatically routes to the best agent:

**Deep Work:** `deep`, `ultrabrain`, `deep-reasoning` → Sisyphus
**Backend:** `backend`, `debugging`, `refactor`, `testing`, `deployment`, `migration` → Sisyphus
**Frontend:** `visual-engineering`, `artistry`, `accessibility`, `i18n`, `seo`, `develop-web-game` → Frontend UI/UX
**Review:** `code-review`, `spec-review` → Momus
**Architecture:** `api-design`, `architect` → Architect
**Database:** `database` → Database Expert
**Research:** `brainstorming`, `business-analysis` → Oracle
**Writing:** `writing`, `research` → DevRel
**Security:** `security`, `performance` → Hephaestus
**Analysis:** `token-efficiency`, `introspection` → Metis
**Quick:** `quick`, `unspecified-low` → Librarian
**Image:** `image-generation` → Image Generator

---

## 11 MCP Servers

One-click install from the built-in registry:

| Server | Description | Env Vars |
|--------|-------------|----------|
| **postgres** | PostgreSQL database access | `POSTGRES_CONNECTION_STRING` |
| **fetch** | HTTP fetch for web content | — |
| **filesystem** | File system operations | — |
| **brave-search** | Web search via Brave | `BRAVE_API_KEY` |
| **slack** | Slack workspace integration | `SLACK_BOT_TOKEN` |
| **redis** | Redis cache/store access | `REDIS_URL` |
| **docker** | Docker container management | — |
| **sentry** | Error tracking via Sentry | `SENTRY_AUTH_TOKEN` |
| **context7** | Library documentation search | — |
| **grep-app** | Code search via grep.app | — |
| **exa-websearch** | AI-powered web search | `EXA_API_KEY` |

---

## 10 LSP Configurations

Auto-detected by project stack:

| LSP | Detects | Install |
|-----|---------|---------|
| **TypeScript** | `tsconfig.json`, `package.json` | `npm i -g typescript-language-server typescript` |
| **Tailwind CSS** | `tailwind.config.*` | `npm i -g @tailwindcss/language-server` |
| **ESLint** | `.eslintrc*`, `eslint.config.js` | `npm i -g vscode-langservers-extracted` |
| **CSS** | `*.css`, `*.scss` | `npm i -g vscode-langservers-extracted` |
| **HTML** | `*.html` | `npm i -g vscode-langservers-extracted` |
| **JSON** | `*.json` | `npm i -g vscode-langservers-extracted` |
| **YAML** | `*.yml`, `*.yaml` | `npm i -g yaml-language-server` |
| **Prisma** | `schema.prisma` | `npm i -g @prisma/language-server` |
| **SQL** | `*.sql` | `npm i -g sql-language-server` |
| **Markdown** | `*.md` | `brew install marksman` |

---

## Config

### Plugin mode
Configs are managed automatically via tools.

### CLI mode
```
~/.omocs/
├── config.json      # Accounts, preferences (encrypted keys)
├── profiles/        # Custom profile definitions
├── agents/          # Custom agent role overrides
└── stats.json       # Token usage data
```

### Config files touched
- `oh-my-opencode.json` — Agent and category model overrides
- `.opencode.json` / `opencode.json` — OpenCode main config (agents, MCP, LSP)

Both files are backed up before modification.

---

## Requirements

- [Bun](https://bun.sh) runtime
- [OpenCode](https://github.com/opencode-ai/opencode) installed
- At least one AI provider API key

## Contributing

PRs welcome. Keep it simple, keep it useful.

## License

MIT
