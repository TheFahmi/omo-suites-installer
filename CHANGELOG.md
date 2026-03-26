# Changelog

All notable changes to OMO Suites will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.0] - 2026-03-26

### Added
- `omocs compact config` — scan and clean stale config entries (duplicate plugins, empty MCP servers, stale provider keys)
- `omocs compact memory` — trim old workspace memory notes with archiving (--keep, --older-than)
- `omocs compact index` — clean up orphaned workspace indexes for non-existent workspaces
- `omocs compact stats` — trim old stats data with archiving (--keep-days)
- `omocs compact all` — run all compact operations with combined summary
- All compact subcommands default to dry-run; use `--fix` to apply changes
- Automatic backup before any destructive operation

## [1.11.0] - 2026-03-25

### Added
- `omocs memory list|add|search|remove` — Workspace Memory Notes
  - Workspace-scoped persistent notes stored in `~/.omocs/memory/`
  - Supports fuzzy search and global notes via `--global`
- `omocs completion <shell>` — Shell Completions
  - Generates completion scripts for bash, zsh, and fish
  - Includes subcommands and flags
- Enhanced `omocs doctor`
  - Added checks for Provider endpoint ping, Config file validity, oh-my-opencode installation, Skills directory, and Disk space
- `omocs index build|show|clean` — Workspace Index
  - Scans workspace to build a cacheable JSON index
  - Detects tech stack, entry points, and key files
  - Respects `.gitignore` and skips noisy directories

## [1.10.0] - 2026-03-25

### Added
- `omocs init-deep [path]` — Auto-generate hierarchical AGENTS.md files per significant folder
  - Scans project structure recursively, infers folder purpose, tech stack, naming conventions
  - Generates root AGENTS.md with project overview + per-folder AGENTS.md for significant dirs
  - Supports `--depth <n>` (default: 3) and `--dry-run` to preview
  - Skips node_modules, .git, dist, build, .next, __pycache__, etc.
- `omocs plan` — Prometheus-style interview planner for structured planning before coding
  - Interactive mode asks 5 structured questions (goal, files, constraints, no-change, definition of done)
  - Generates structured plan markdown: `.opencode/plans/plan-YYYY-MM-DD-HHmm.md`
  - Supports `--output <path>` and `--non-interactive` for template generation
- `omocs cost [profile]` — Profile cost calculator with model pricing estimates
  - Shows per-agent cost breakdown (per invocation, per hour, per day)
  - Supports `--compare <profile>` for side-by-side profile cost comparison
  - Supports `--hours <n>` for custom workday projection (default: 8)
  - Includes pricing for Claude Opus 4.6, Sonnet 4.6, GPT-5.3/5.4, Gemini 3.1 Pro, Kimi K2.5, DeepSeek
- `omocs stats --dashboard` — Agent analytics dashboard with TUI bar charts
  - Bar chart visualization for agent usage, token consumption, response times
  - Aggregated stats stored in `~/.omocs/stats.json`
  - Supports `--last <n>` to limit agents shown and `--sync` to import session data
  - Enhanced existing stats command with daily token usage bar charts
- `omocs check` — Comment quality checker for AI-generated code patterns
  - Detects: obvious/redundant comments, vague TODOs, AI attribution, unexplained eslint-disable, @ts-ignore, commented-out code
  - Reports findings with file:line references grouped by severity (high/medium/low)
  - Supports `--fix` to auto-remove fixable AI slop comments
  - Supports `--path <dir>` and `--severity <level>` filters
- Plugin tools: `omocs_init_deep` and `omocs_check` registered as OpenCode plugin tools
- System prompt injection updated with init-deep and check tool references

## [1.9.2] - 2026-03-25

### Added
- `omocs export [filename]` — export all config to single JSON file
- `omocs import <filename>` — import config with confirmation (supports --force)
- `omocs diff <profile1> <profile2>` — side-by-side profile comparison with color-coded output
- `omocs benchmark [prompt]` — compare response time across models (supports --models, --timeout)
- `omocs mcp status` — MCP server health check with green/red status indicators
- `omocs init --quick` — quick setup with auto-detection from env vars
- Missing 67th task category: risk-management → agency-project-shepherd

### Fixed
- LSP glob detection bug — CSS, HTML, JSON, YAML, SQL, Markdown LSPs now detectable
- Async/sync mismatch in config.ts
- Stale PLUGIN_VERSION fallback
- README updated to 28 agents, 67 task categories

### Changed
- API key encryption using AES-256-GCM (keys encrypted before storing in config)
- Deduplicated `findPackageJson()` into single utility
- Atomic config writes (write to temp file, rename — prevents corruption)
- Improved error messages with contextual help suggestions
- Moved `better-sqlite3` to optionalDependencies
- CLI startup optimization (skip update check for --help/--version)

## [1.9.1] - 2026-03-25

### Added
- 13 new Agency agents (from github.com/msitarzewski/agency-agents): security-engineer, devops-automator, mobile-app-builder, ai-engineer, rapid-prototyper, accessibility-auditor, performance-benchmarker, api-tester, brand-guardian, content-creator, growth-hacker, ux-researcher, project-shepherd
- Agent system prompt markdown files for all 13 new agents
- Total agents expanded from 15 → 28, task categories from 32 → 67

### Changed
- Plugin agent list header updated to reflect 28 agents, 67 task categories
- `omocs_categories` tool description updated to 67 categories

## [1.9.0] - 2026-03-07

### Added
- **`omocs status` command** — shows current provider info, API key (masked), default model, and config path
- 1mr.tech token balance fetching in `omocs status` (tokens remaining, tokens used, key status)
- **1mr.tech provider support in `omocs init`** (Step 5) — prompt for API key, validate via `GET /v1/usage`, select model
- Auto-generates `opencode.json` and `oh-my-opencode.json` with 1mr.tech config
- Graceful fallback when 1mr.tech API is unreachable (skip validation with warning)

### Changed
- **Launchboard rewritten to pull from OpenCode API** — removed SQLite/Drizzle dependency entirely, backend now proxies to OpenCode API (default `localhost:1337`)
- New Launchboard routes: `/api/sessions`, `/api/board` (aggregated kanban)
- Launchboard kanban board shows todo status columns: Pending → In Progress → Completed → Cancelled
- Todo cards show content, priority badge, parent session; sidebar lists sessions with todo counts
- Auto-refresh every 30 seconds; graceful "No OpenCode detected" screen when API unreachable
- `OPENCODE_API_URL` env var for Launchboard configuration
- **Launchboard auto-update system** — git + npm dual-mode auto-update with 5-minute cache, `/api/update` endpoint for status/trigger

### Removed
- Launchboard local database (`db/`, `drizzle.config`, `setup.sh`)
- Launchboard MCP server, stats/rules pages, drag-and-drop (now read-only board)
- Launchboard `columns`, `labels`, `tasks`, `workspaces`, `stats`, `rules` routes

## [1.8.0] - 2026-03-07

### Added
- Auto-update check when OpenCode starts (plugin load) — checks npm, auto-installs if newer version available
- Shares same 5-min cache as CLI auto-update to avoid duplicate checks

## [1.7.9] - 2026-03-07

### Fixed
- CLI doctor now checks opencode.json (was .opencode.json) and oh-my-opencode.json
- Both CLI and TUI doctor views are now consistent

## [1.7.8] - 2026-03-07

### Fixed
- Auto-update re-exec fails on Windows when node path contains spaces (e.g. C:\Program Files\...)
- Properly quote process.argv[0] and args with spaces

## [1.7.7] - 2026-03-07

### Fixed
- Launchboard start now works on Windows — replaced `bash setup.sh` with cross-platform TypeScript logic
- Deps install, DB setup, and process management all work without bash

## [1.7.6] - 2026-03-07

### Fixed
- Config detection now checks `opencode.json`, `.opencode/opencode.json`, and `~/.config/opencode/opencode.json` (was only checking `.opencode.json`)
- Doctor now also checks for `oh-my-opencode.json`

## [1.7.5] - 2026-03-07

### Added
- `omo` command alias — both `omo` and `omocs` now work

## [1.7.4] - 2026-03-07

### Fixed
- Sidebar width increased from 14 to 18 chars — Launchboard text no longer breaks box drawing

## [1.7.3] - 2026-03-07

### Fixed
- TUI dashboard now shows correct version (was hardcoded 1.2.0/1.1.0)
- Version resolution walks up directories to find package.json in all install contexts

## [1.7.2] - 2026-03-07

### Fixed
- **Launchboard auto-downloads from GitHub when not bundled** — npm installs no longer skip Launchboard with "not found"
- When `packages/launchboard/` is missing (npm install), auto-clones from GitHub to `~/.omocs/launchboard/`
- Persistent location (`~/.omocs/launchboard/`) survives npm updates — only downloads once
- Both `omocs init` (Step 4) and `omocs launchboard setup/start` now use shared resolver
- Cross-platform support: works on Windows, macOS, and Linux
- Clear error message when git is not installed

## [1.7.1] - 2026-03-07

### Fixed
- Show version in CLI banner ("OMO Suites v1.7.1 — CLI toolkit for OpenCode power users")
- Fixed typo: OMOC → OMO in banner tagline

## [1.7.0] - 2026-03-07

### Changed
- **Rewrote `omocs init` Step 6 to use oh-my-opencode subscription-based flow** — replaces manual API key entry
- Provider authentication now asks about subscriptions (Claude Pro/Max, ChatGPT Plus, Gemini, GitHub Copilot, OpenCode Zen, Z.ai Coding Plan)
- Runs `oh-my-opencode install --no-tui` with appropriate flags based on user answers
- For Gemini: auto-registers `opencode-antigravity-auth@latest` plugin in opencode.json
- Claude flag supports `--claude=yes|no|max20` based on max20 mode selection

### Removed
- **Master Password step** — no longer needed since API keys aren't stored locally
- **Manual API key collection** — replaced by subscription-based oh-my-opencode installer
- `PROVIDERS` array and `AUTH_PLUGINS` array from init command
- `encrypt()` / `hashPassword()` imports from init command
- `accounts` and `masterPasswordHash` from saved config

### Fixed
- Steps renumbered: 9 steps total (was 10). Step 5 = Provider Authentication, Step 6 = Profile, Step 7 = Detection, Step 8 = MCP, Step 9 = Save

## [1.6.0] - 2026-03-07

### Added
- **Auth plugin support in `omocs init`** — authenticate via OAuth/CLI login instead of pasting API keys
- Auth plugins offered first (recommended), manual API keys offered second
- Supported auth plugins: Antigravity (Google DeepMind), OpenAI Codex
- Auth plugins auto-installed via `npm install -g` with spinner and error handling
- Auth plugins auto-registered in `opencode.json` plugin array
- Summary box shows both auth plugins and manual API keys configured

## [1.5.4] - 2026-03-07

### Added
- Auto-update on every CLI run — checks npm for new version, updates automatically
- 5-minute cooldown between checks to avoid spamming npm registry
- Disable with `OMOCS_NO_UPDATE=1` env var

## [1.5.3] - 2026-03-07

### Fixed
- `omocs doctor` now detects installed tools on Windows (was using `which` instead of `where`)

## [1.5.2] - 2026-03-07

### Fixed
- **Node.js compatibility** — replaced all Bun-specific APIs (`Bun.file()`, `Bun.write()`, `Bun.spawn()`) with Node.js `fs` and `child_process` equivalents
- `Bun is not defined` errors when running via `npm i -g` on systems without Bun
- `bun:sqlite` replaced with `better-sqlite3` for cross-runtime SQLite support
- All 10 source files updated: config.ts, store.ts, opencode.ts, profile.ts, stats.ts, agents.ts, detect.ts, shell.ts, tui/views/stats.ts, tui/commands.ts

## [1.5.1] - 2026-03-07

### Fixed
- Repository URL in package.json (corrected to `omo-suites-installer`)

## [1.5.0] - 2026-03-07

### Added
- `omocs init` auto-installs oh-my-opencode
- `omocs init` registers OMO Suites + oh-my-opencode as OpenCode plugins
- `omocs init` optionally sets up Launchboard (Kanban board)
- One command setup: OpenCode → oh-my-opencode → OMO Suites → Launchboard
- Helper functions: `findOpencodeConfig()`, `checkOhMyOpenCode()` in opencode.ts
- **Published to npm as `omo-suites`** — install via `npm install -g omo-suites`
- Node.js compatibility — CLI compiled to JS, works without Bun
- `build:all` and `prepublishOnly` scripts for npm publishing
- `engines` field requiring Node.js >= 18

## [1.4.0] - 2026-03-07

### Added
- Launchboard included as monorepo package (`packages/launchboard/`)
- CLI commands: `omocs launchboard setup|start|status`
- CLI alias: `omocs lb` (shorthand)
- TUI dashboard: Launchboard view with status and quick actions
- Workspace support via `"workspaces": ["packages/*"]`
- One install gets everything: OMO Suites + Launchboard

## [1.3.0] - 2026-03-07

### Added
- Launchboard integration — 4 new plugin tools (omocs_task_list, omocs_task_create, omocs_task_update, omocs_task_move)
- Launchboard data helpers (`src/data/launchboard.ts`)
- System prompt injection updated to advertise Launchboard tools

## [1.2.0] - 2026-03-06

### Added
- Versioning system — single source of truth from `package.json`
- Dynamic version display in CLI (`--version`), TUI header, and plugin load log
- `CHANGELOG.md` with full release history

## [1.1.0] - 2026-03-06

### Added
- Interactive TUI Dashboard with split-pane layout (`omocs` with no args)
- 16 slash commands (`/help`, `/profile`, `/agent`, `/mcp`, `/lsp`, `/stats`, etc.)
- OpenCode plugin via `@opencode-ai/plugin` API (12 tools)
- 13 profiles with 4 scope types (all, lead, mixed, economy)
- 15 agents synced to oh-my-opencode v3.8.4
- 32 task category routing with `getAgentForCategory()`
- System prompt injection via `experimental.chat.system.transform`
- Agent-friendly installation guide (`docs/installation.md`)
- Docs split: `docs/profiles.md`, `docs/agents.md`, `docs/mcp.md`, `docs/lsp.md`, `docs/plugin.md`, `docs/cli.md`

### Changed
- README simplified to landing page
- Agent renames: Explorer→explore, FrontendSpecialist→frontend-ui-ux-engineer, DevOpsEngineer→devrel
- Models updated to Opus 4.6, Sonnet 4.6, GPT-5.3 Codex, Gemini 3.1 Pro High

### Removed
- OCS comparison table from README

## [1.0.0] - 2026-03-05

### Added
- Initial release
- CLI toolkit with `commander` — profile, agent, MCP, LSP management
- 6 modules: account, profile, agent, LSP, MCP, stats
- Multi-account support
- Config management (read/write `oh-my-opencode.json` + `opencode.json`)
- Doctor diagnostic command
- Bun-first runtime
