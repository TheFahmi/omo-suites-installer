import { Hono } from 'hono';
import type { Session, Todo } from '../types';

const OPENCODE_API = process.env.OPENCODE_API_URL || 'http://localhost:1337';

const app = new Hono();

// List all sessions
app.get('/', async (c) => {
  try {
    const res = await fetch(`${OPENCODE_API}/session`);
    if (!res.ok) {
      return c.json({ error: `OpenCode API error: ${res.status}` }, 502);
    }
    const sessions: Session[] = await res.json();
    // Sort by most recently updated
    sessions.sort((a, b) => b.time.updated - a.time.updated);
    return c.json(sessions);
  } catch (err) {
    return c.json(
      { error: 'Cannot connect to OpenCode API', details: String(err) },
      503
    );
  }
});

// Get single session
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  try {
    const res = await fetch(`${OPENCODE_API}/session/${id}`);
    if (!res.ok) {
      return c.json({ error: `Session not found: ${res.status}` }, res.status as any);
    }
    const session: Session = await res.json();
    return c.json(session);
  } catch (err) {
    return c.json(
      { error: 'Cannot connect to OpenCode API', details: String(err) },
      503
    );
  }
});

// Get todos for a session
app.get('/:id/todos', async (c) => {
  const { id } = c.req.param();
  try {
    const res = await fetch(`${OPENCODE_API}/session/${id}/todo`);
    if (!res.ok) {
      return c.json({ error: `Failed to fetch todos: ${res.status}` }, res.status as any);
    }
    const todos: Todo[] = await res.json();
    return c.json(todos);
  } catch (err) {
    return c.json(
      { error: 'Cannot connect to OpenCode API', details: String(err) },
      503
    );
  }
});

// Get messages for a session
app.get('/:id/messages', async (c) => {
  const { id } = c.req.param();
  try {
    const res = await fetch(`${OPENCODE_API}/session/${id}/messages`);
    if (!res.ok) {
      return c.json({ error: `Failed to fetch messages: ${res.status}` }, res.status as any);
    }
    const messages = await res.json();
    return c.json(messages);
  } catch (err) {
    return c.json(
      { error: 'Cannot connect to OpenCode API', details: String(err) },
      503
    );
  }
});

// Get child sessions
app.get('/:id/children', async (c) => {
  const { id } = c.req.param();
  try {
    const res = await fetch(`${OPENCODE_API}/session/${id}/children`);
    if (!res.ok) {
      return c.json({ error: `Failed to fetch children: ${res.status}` }, res.status as any);
    }
    const children = await res.json();
    return c.json(children);
  } catch (err) {
    return c.json(
      { error: 'Cannot connect to OpenCode API', details: String(err) },
      503
    );
  }
});

export default app;
