# Changelog

All notable changes to OMO Suites will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-07

### Added
- Flowtask integration — 4 new plugin tools (omocs_task_list, omocs_task_create, omocs_task_update, omocs_task_move)
- Flowtask data helpers (`src/data/flowtask.ts`)
- System prompt injection updated to advertise Flowtask tools

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
