# CLI Reference

Full command reference for OMO Suites standalone CLI.

## Global Flags

All commands support the following global options:

- `--debug`: Enable verbose debug output and stack traces
- `--verbose`: Show detailed information (e.g., in status, doctor, etc)

## Setup

```bash
omocs init              # Interactive setup wizard
omocs doctor            # Check if everything works
```

## Account Management

```bash
omocs account add       # Add API key (encrypted storage)
omocs account list      # Show all accounts + status
omocs account rotate    # Switch to next available key
omocs account check     # Verify key health
```

## Profiles

```bash
omocs profile list      # Show all 13 profiles
omocs profile use <name>  # Switch profile
omocs profile create    # Build a custom profile
omocs profile export    # Share profile as JSON
```

See [profiles.md](profiles.md) for the full list of available profiles.

## Agents

```bash
omocs agent list        # Show 15 agent roles
omocs agent use <name>  # Switch active agent
omocs agent info <name> # Agent details + system prompt
omocs agent categories  # List all 32 task categories
omocs agent route <cat> # Which agent handles this category?
```

See [agents.md](agents.md) for the full agent roster and routing table.

## LSP

```bash
omocs lsp detect        # Scan project, suggest LSP servers
omocs lsp install       # Install detected LSP servers
```

See [lsp.md](lsp.md) for all supported LSP configurations.

## MCP

```bash
omocs mcp list          # Available MCP tools
omocs mcp install <srv> # Install + auto-configure
```

See [mcp.md](mcp.md) for all available MCP servers.

## Stats

```bash
omocs stats             # Token usage summary
```

## Config

### Config directory

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
