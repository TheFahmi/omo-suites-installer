import { Hono } from 'hono';
import type { Session, Todo, BoardColumn, BoardTodo } from '../types';

const OPENCODE_API = process.env.OPENCODE_API_URL || 'http://localhost:1337';

const COLUMNS = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

const COLUMN_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const app = new Hono();

// GET /api/board — aggregate all sessions' todos into a kanban board
app.get('/', async (c) => {
  const filterSessionId = c.req.query('session');

  try {
    // 1. Fetch all sessions
    const sessionsRes = await fetch(`${OPENCODE_API}/session`);
    if (!sessionsRes.ok) {
      return c.json({ error: `OpenCode API error: ${sessionsRes.status}` }, 502);
    }

    let sessions: Session[] = await sessionsRes.json();

    // Handle case where API returns object instead of array
    if (sessions && !Array.isArray(sessions)) {
      sessions = Object.values(sessions);
    }

    if (!sessions || sessions.length === 0) {
      return c.json({
        columns: COLUMNS.map((id) => ({
          id,
          name: COLUMN_LABELS[id],
          todos: [],
        })),
        sessions: [],
      });
    }

    // 2. If filtering by session, only fetch that one
    const targetSessions = filterSessionId
      ? sessions.filter((s) => s.id === filterSessionId)
      : sessions;

    // 3. Fetch todos for all target sessions in parallel
    const todoResults = await Promise.allSettled(
      targetSessions.map(async (session) => {
        try {
          const res = await fetch(`${OPENCODE_API}/session/${session.id}/todo`);
          if (!res.ok) return { session, todos: [] as Todo[] };
          let todos: Todo[] = await res.json();

          // Handle case where API returns object instead of array
          if (todos && !Array.isArray(todos)) {
            todos = Object.values(todos);
          }

          return { session, todos: todos || [] };
        } catch {
          return { session, todos: [] as Todo[] };
        }
      })
    );

    // 4. Flatten into BoardTodos
    const allTodos: BoardTodo[] = [];
    for (const result of todoResults) {
      if (result.status === 'fulfilled') {
        const { session, todos } = result.value;
        for (const todo of todos) {
          allTodos.push({
            ...todo,
            sessionId: session.id,
            sessionTitle: session.title || session.id.slice(0, 8),
          });
        }
      }
    }

    // 5. Group into columns by status
    const columns: BoardColumn[] = COLUMNS.map((status) => ({
      id: status,
      name: COLUMN_LABELS[status],
      todos: allTodos.filter((t) => t.status === status),
    }));

    // Sort sessions by most recently updated
    sessions.sort((a, b) => b.time.updated - a.time.updated);

    return c.json({
      columns,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title || s.id.slice(0, 8),
        directory: s.directory,
        todoCount: allTodos.filter((t) => t.sessionId === s.id).length,
        time: s.time,
        summary: s.summary,
      })),
    });
  } catch (err) {
    return c.json(
      {
        error: 'Cannot connect to OpenCode API',
        details: String(err),
        hint: 'Make sure OpenCode is running (default: localhost:1337)',
      },
      503
    );
  }
});

export default app;
