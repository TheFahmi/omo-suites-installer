import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { CreateColumnInput, UpdateColumnInput, ReorderColumnsInput } from '../types';

const app = new Hono();

// List columns for workspace
app.get('/', async (c) => {
  const workspaceId = c.req.query('workspace');

  if (!workspaceId) {
    return c.json({ error: 'workspace query param is required' }, 400);
  }

  const cols = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.workspaceId, workspaceId))
    .orderBy(asc(schema.columns.position));

  // Include task count per column
  const result = await Promise.all(
    cols.map(async (col) => {
      const taskCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.tasks)
        .where(eq(schema.tasks.columnId, col.id));
      return { ...col, taskCount: taskCount[0]?.count ?? 0 };
    })
  );

  return c.json(result);
});

// Create column
app.post('/', async (c) => {
  const body = await c.req.json<CreateColumnInput>();

  if (!body.workspaceId || !body.name) {
    return c.json({ error: 'workspaceId and name are required' }, 400);
  }

  // Get max position
  const maxPos = await db
    .select({ maxPosition: sql<number>`COALESCE(MAX(${schema.columns.position}), -1)` })
    .from(schema.columns)
    .where(eq(schema.columns.workspaceId, body.workspaceId));
  const position = body.position ?? (maxPos[0]?.maxPosition ?? -1) + 1;

  const columnId = crypto.randomUUID();

  await db.insert(schema.columns).values({
    id: columnId,
    workspaceId: body.workspaceId,
    name: body.name,
    icon: body.icon ?? null,
    position,
    color: body.color ?? null,
    wipLimit: body.wipLimit ?? null,
  });

  const column = await db.query.columns.findFirst({
    where: eq(schema.columns.id, columnId),
  });

  return c.json(column, 201);
});

// Update column
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<UpdateColumnInput>();

  const existing = await db.query.columns.findFirst({
    where: eq(schema.columns.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Column not found' }, 404);
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.position !== undefined) updateData.position = body.position;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.wipLimit !== undefined) updateData.wipLimit = body.wipLimit;

  await db.update(schema.columns).set(updateData).where(eq(schema.columns.id, id));

  const updated = await db.query.columns.findFirst({
    where: eq(schema.columns.id, id),
  });

  return c.json(updated);
});

// Delete column (move tasks to Backlog)
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await db.query.columns.findFirst({
    where: eq(schema.columns.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Column not found' }, 404);
  }

  // Find the Backlog column (first column by position)
  const backlogCol = await db
    .select()
    .from(schema.columns)
    .where(
      and(
        eq(schema.columns.workspaceId, existing.workspaceId),
        sql`${schema.columns.id} != ${id}`
      )
    )
    .orderBy(asc(schema.columns.position))
    .limit(1);

  if (backlogCol.length > 0) {
    // Move all tasks from deleted column to backlog
    await db
      .update(schema.tasks)
      .set({ columnId: backlogCol[0].id })
      .where(eq(schema.tasks.columnId, id));
  }

  await db.delete(schema.columns).where(eq(schema.columns.id, id));

  return c.json({ success: true });
});

// Reorder columns
app.post('/reorder', async (c) => {
  const body = await c.req.json<ReorderColumnsInput>();

  if (!body.columns || !Array.isArray(body.columns)) {
    return c.json({ error: 'columns array is required' }, 400);
  }

  for (const col of body.columns) {
    await db
      .update(schema.columns)
      .set({ position: col.position })
      .where(eq(schema.columns.id, col.id));
  }

  return c.json({ success: true });
});

export default app;
