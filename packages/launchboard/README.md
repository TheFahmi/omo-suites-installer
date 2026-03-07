# Launchboard

OpenCode session & todo Kanban board — connects to OpenCode's API to display your sessions and todos in a visual kanban layout.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js :3040)          Backend (Hono :3030)      │
│                                                              │
│  Board Page ──→ /api/board ──→ OpenCode API (:1337)         │
│  Sessions   ──→ /api/sessions ──→ GET /session              │
│  Todos      ──→ /api/sessions/:id/todos ──→ GET /session/id/todo │
└─────────────────────────────────────────────────────────────┘
```

No local database. All data comes from OpenCode's running API.

## Quick Start

1. Start OpenCode (default port 1337):
   ```bash
   opencode
   ```

2. Start the backend:
   ```bash
   cd packages/launchboard
   bun run dev
   ```

3. Start the frontend:
   ```bash
   cd packages/launchboard/frontend
   bun install
   bun run dev
   ```

4. Open http://localhost:3040

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_API_URL` | `http://localhost:1337` | OpenCode API endpoint |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3030` | Launchboard backend URL |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check + OpenCode connectivity |
| `GET /api/sessions` | List all OpenCode sessions |
| `GET /api/sessions/:id` | Get single session |
| `GET /api/sessions/:id/todos` | Get todos for a session |
| `GET /api/board` | Aggregated kanban board (all sessions' todos) |
| `GET /api/board?session=<id>` | Filtered board for one session |

## Board Layout

```
┌─ Pending ─────┐ ┌─ In Progress ──┐ ┌─ Completed ────┐ ┌─ Cancelled ────┐
│ [Fix auth bug] │ │ [Add logging]  │ │ [Setup CI/CD]  │ │                │
│ Session: main  │ │ Session: feat-x│ │ Session: main  │ │                │
│ Priority: high │ │ Priority: med  │ │ Priority: low  │ │                │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

- **Columns:** Based on todo status (pending, in_progress, completed, cancelled)
- **Cards:** Show content, priority badge, parent session name
- **Sidebar:** List of sessions with todo counts, clickable to filter
- **Auto-refresh:** Every 30 seconds
- **Graceful fallback:** Shows "No OpenCode instance detected" when API is unreachable
