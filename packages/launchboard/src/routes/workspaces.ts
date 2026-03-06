import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, sql, count } from 'drizzle-orm';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '../types';

const DEFAULT_COLUMNS = [
  { name: 'Backlog', icon: '📥', position: 0, color: '#6b7280' },
  { name: 'Planned', icon: '📋', position: 1, color: '#3b82f6' },
  { name: 'Ready', icon: '🎯', position: 2, color: '#8b5cf6' },
  { name: 'In Progress', icon: '🔨', position: 3, color: '#f59e0b' },
  { name: 'Testing', icon: '🧪', position: 4, color: '#06b6d4' },
  { name: 'Done', icon: '✅', position: 5, color: '#22c55e' },
];

const DEFAULT_LABELS = [
  { name: 'feat', color: '#22c55e' },
  { name: 'bug', color: '#ef4444' },
  { name: 'chore', color: '#f59e0b' },
  { name: 'research', color: '#3b82f6' },
  { name: 'docs', color: '#06b6d4' },
];

const app = new Hono();

// List all workspaces with task counts
app.get('/', async (c) => {
  const allWorkspaces = await db.select().from(schema.workspaces);

  const result = await Promise.all(
    allWorkspaces.map(async (ws) => {
      const taskCount = await db
        .select({ count: count() })
        .from(schema.tasks)
        .where(eq(schema.tasks.workspaceId, ws.id));
      return { ...ws, taskCount: taskCount[0]?.count ?? 0 };
    })
  );

  return c.json(result);
});

// Create workspace with default columns and labels
app.post('/', async (c) => {
  const body = await c.req.json<CreateWorkspaceInput>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const workspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: body.name,
    icon: body.icon ?? '📁',
    color: body.color ?? '#d4a853',
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Create default columns
  for (const col of DEFAULT_COLUMNS) {
    await db.insert(schema.columns).values({
      id: crypto.randomUUID(),
      workspaceId,
      name: col.name,
      icon: col.icon,
      position: col.position,
      color: col.color,
    });
  }

  // Create default labels
  for (const label of DEFAULT_LABELS) {
    await db.insert(schema.labels).values({
      id: crypto.randomUUID(),
      workspaceId,
      name: label.name,
      color: label.color,
    });
  }

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId,
    action: 'workspace_created',
    actor: 'system',
    details: JSON.stringify({ name: body.name }),
    createdAt: now,
  });

  const workspace = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, workspaceId),
  });

  return c.json(workspace, 201);
});

// Get workspace with columns and labels
app.get('/:id', async (c) => {
  const { id } = c.req.param();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, id),
  });

  if (!workspace) {
    return c.json({ error: 'Workspace not found' }, 404);
  }

  const cols = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.workspaceId, id))
    .orderBy(schema.columns.position);

  const lbls = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.workspaceId, id));

  const rls = await db
    .select()
    .from(schema.rules)
    .where(eq(schema.rules.workspaceId, id));

  return c.json({ ...workspace, columns: cols, labels: lbls, rules: rls });
});

// Update workspace
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<UpdateWorkspaceInput>();

  const existing = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Workspace not found' }, 404);
  }

  const now = new Date().toISOString();
  await db
    .update(schema.workspaces)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.description !== undefined && { description: body.description }),
      updatedAt: now,
    })
    .where(eq(schema.workspaces.id, id));

  const updated = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, id),
  });

  return c.json(updated);
});

// Delete workspace (cascade)
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Workspace not found' }, 404);
  }

  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));

  return c.json({ success: true });
});

export default app;
