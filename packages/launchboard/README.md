# Launchboard

> Plan. Build. Launch.

AI-integrated Kanban board for developers and teams. Built for humans who ship and AI agents who help.

## Features

- **Kanban Board** — Drag-and-drop task management with customizable columns
- **AI Agent Integration** — Tasks can be created, updated, and moved by AI agents
- **MCP Server** — Connect to OpenCode and other AI coding tools
- **Workspaces** — Organize projects with dedicated boards, labels, and rules
- **Project Rules** — Define guidelines that AI agents follow
- **Stats & Velocity** — Track team productivity and completion rates
- **REST API** — Full CRUD API for automation and integrations
- **Dark Theme** — Beautiful dark UI with gold accents

## Quick Start

```bash
git clone https://github.com/TheFahmi/launchboard.git
cd launchboard
./setup.sh
```

Backend runs on `http://localhost:3030`, frontend on `http://localhost:3040`.

## Tech Stack

- **Backend:** Bun + Hono + Drizzle ORM + SQLite
- **Frontend:** Next.js 16 + Tailwind CSS + @dnd-kit
- **MCP:** Model Context Protocol for AI tool integration
- **Icons:** Lucide React

## MCP Integration

Add Launchboard to your OpenCode config:

```json
{
  "mcp": {
    "launchboard": {
      "command": "bun",
      "args": ["run", "/path/to/launchboard/src/mcp/server.ts"],
      "env": {
        "LAUNCHBOARD_API_URL": "http://localhost:3030"
      }
    }
  }
}
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspaces` | GET/POST | List/create workspaces |
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/tasks/:id` | GET/PATCH/DELETE | Get/update/delete task |
| `/api/tasks/:id/move` | POST | Move task between columns |
| `/api/tasks/:id/comments` | GET/POST | Task comments |
| `/api/columns` | GET/POST | List/create columns |
| `/api/labels` | GET/POST | List/create labels |
| `/api/rules` | GET/POST | List/create project rules |
| `/api/stats/:workspaceId` | GET | Workspace statistics |

## License

MIT
