# MCP Servers

OMO Suites includes a registry of **11 MCP (Model Context Protocol) servers** with one-click install and auto-configuration.

## Available Servers

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

## Usage

```bash
# List available MCP servers
omocs mcp list

# Install + auto-configure a server
omocs mcp install ctx7
omocs mcp install postgres
omocs mcp install brave-search
```

## How It Works

When you install an MCP server, OMO Suites:

1. Adds the server configuration to your `opencode.json`
2. Sets up required environment variables (prompts for values)
3. Installs the npm package if needed
4. Backs up your config before any changes

Servers that require API keys will prompt you during installation. You can also set environment variables beforehand.
