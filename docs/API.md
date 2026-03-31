# OMO Suites — API & Command Reference

## Installation

```bash
npm install -g omo-suites
```

After installation, two CLI commands are available: `omocs` and `omo` (alias).

---

## CLI Commands

### `omocs init`
Interactive setup wizard for OpenCode projects. Creates `opencode.json`, `AGENTS.md`, and configures LLM providers.

```bash
omocs init              # Interactive setup
omocs init --deep       # Deep initialization with advanced options
```

### `omocs doctor`
System health check. Validates configuration, checks dependencies, and detects common issues.

```bash
omocs doctor            # Run all health checks
omocs doctor --fix      # Auto-fix detected issues
```

### `omocs self-test`
Core integration validation. Tests LLM connectivity, MCP servers, and plugin functionality.

```bash
omocs self-test
```

### `omocs config`
Configuration management with schema validation.

```bash
omocs config validate   # Validate current config against schema
omocs config show       # Display current configuration
omocs config set <key> <value>  # Set a config value
omocs config get <key>  # Get a config value
```

### `omocs profile`
Manage configuration profiles for different contexts (work, personal, projects).

```bash
omocs profile list      # List all profiles
omocs profile use <name>  # Switch to a profile
omocs profile create <name>  # Create new profile
omocs profile delete <name>  # Delete a profile
omocs profile export <name> <path>  # Export profile to file
omocs profile import <path>  # Import profile from file
```

### `omocs agent`
Manage AI agent configurations and routing.

```bash
omocs agent list        # List configured agents
omocs agent add <name>  # Add new agent
omocs agent remove <name>  # Remove agent
omocs agent show <name>  # Show agent details
```

### `omocs mcp`
Manage MCP (Model Context Protocol) server configurations.

```bash
omocs mcp list          # List configured MCP servers
omocs mcp add <name>    # Add MCP server
omocs mcp remove <name> # Remove MCP server
omocs mcp status        # Check MCP server connectivity
```

### `omocs lsp`
Manage LSP (Language Server Protocol) configurations.

```bash
omocs lsp list          # List configured LSP servers
omocs lsp add <name>    # Add LSP server
omocs lsp remove <name> # Remove LSP server
```

### `omocs compact`
Compact and optimize project data.

```bash
omocs compact config    # Compact configuration
omocs compact memory    # Compact memory/context
omocs compact index     # Compact search index
omocs compact stats     # Show compaction stats
omocs compact all       # Compact everything
```

### `omocs session`
Manage OpenCode sessions.

```bash
omocs session list      # List sessions
omocs session show <id> # Show session details
omocs session clean     # Clean old sessions
```

### `omocs worktree`
Manage git worktrees for parallel development.

```bash
omocs worktree list     # List worktrees
omocs worktree create <branch>  # Create worktree
omocs worktree remove <branch>  # Remove worktree
```

### `omocs template`
Bootstrap project templates.

```bash
omocs template list     # List available templates
omocs template create <name>  # Create from template
```

### `omocs squad`
Multi-agent squad management.

```bash
omocs squad launch      # Launch agent squad
omocs squad status      # Check squad status
omocs squad kill        # Kill running squad
omocs squad clean       # Clean squad artifacts
```

### `omocs auto`
Auto-check runner (used by OpenCode plugin on startup).

```bash
omocs auto              # Run auto checks
omocs auto --skip-compact  # Skip compaction checks
```

### `omocs watch`
File watcher for auto-indexing and live updates.

```bash
omocs watch             # Start watching project
omocs watch --dir <path>  # Watch specific directory
```

### `omocs stats`
Project and usage statistics.

```bash
omocs stats             # Show project stats
```

### `omocs cost`
LLM usage cost tracking.

```bash
omocs cost              # Show cost summary
omocs cost --detailed   # Detailed breakdown
```

### `omocs benchmark`
Run LLM benchmarks.

```bash
omocs benchmark         # Run default benchmark
omocs benchmark --model <name>  # Benchmark specific model
```

### `omocs plan`
Generate implementation plans.

```bash
omocs plan <description>  # Generate plan from description
```

### `omocs diff`
Smart diff viewer with AI analysis.

```bash
omocs diff              # Show staged changes
omocs diff --ai         # AI-powered diff analysis
```

### `omocs memory`
Manage project memory/context.

```bash
omocs memory show       # Show current memory
omocs memory clear      # Clear memory
```

### `omocs account`
Manage OMO Suites account.

```bash
omocs account           # Show account info
omocs account login     # Login
omocs account logout    # Logout
```

### `omocs marketplace`
Browse and install community extensions.

```bash
omocs marketplace list  # List available extensions
omocs marketplace install <name>  # Install extension
```

### `omocs launchboard`
Interactive TUI dashboard.

```bash
omocs launchboard       # Open dashboard
```

### `omocs fallback`
Configure LLM fallback chains.

```bash
omocs fallback list     # List fallback chains
omocs fallback set <primary> <fallback>  # Set fallback
```

### `omocs completion`
Shell completion scripts for bash, zsh, and fish.

```bash
omocs completion bash   # Output bash completions
omocs completion zsh    # Output zsh completions
omocs completion fish   # Output fish completions

# Installation:
omocs completion bash >> ~/.bashrc
omocs completion zsh >> ~/.zshrc
omocs completion fish > ~/.config/fish/completions/omocs.fish
```

### `omocs status`
Quick status overview.

```bash
omocs status            # Show status
```

### `omocs check`
Run project checks.

```bash
omocs check             # Run all checks
```

---

## Global Flags

All commands support these flags:

| Flag | Description |
|------|-------------|
| `--debug` | Enable debug output |
| `--verbose` | Enable verbose logging |
| `--help` | Show command help |
| `--version` | Show version |

---

## Configuration Schema

OMO Suites uses `opencode.json` in the project root:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "sk-...",
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "env": {}
    }
  },
  "agents": {
    "default": {
      "model": "claude-sonnet-4-20250514",
      "systemPrompt": "..."
    }
  }
}
```

Global config lives at `~/.omocs/config.json`.

---

## Plugin API (OpenCode Integration)

OMO Suites can be loaded as an OpenCode plugin:

```json
// opencode.json
{
  "plugins": ["omo-suites"]
}
```

The plugin provides:
- **Auto-checks** on startup (doctor, compact, index)
- **Agent routing** for multi-model orchestration
- **MCP/LSP management** with health monitoring
- **Session management** with context compaction
- **Telemetry** (opt-in) for usage analytics

### Plugin Entry Point

```typescript
import plugin from 'omo-suites';
// Plugin exports conform to OpenCode's plugin interface
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OMOCS_NO_LOGS` | Disable structured logging |
| `OMOCS_DEBUG` | Enable debug mode |
| `OMOCS_HOME` | Override config directory (default: `~/.omocs`) |
| `OPENCODE_CONFIG` | Override opencode.json path |
