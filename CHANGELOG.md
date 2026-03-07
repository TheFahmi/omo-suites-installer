# Changelog

All notable changes to OMO Suites will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
