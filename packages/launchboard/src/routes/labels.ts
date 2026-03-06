import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import type { CreateLabelInput, UpdateLabelInput } from '../types';

const app = new Hono();

// List labels for workspace
app.get('/', async (c) => {
  const workspaceId = c.req.query('workspace');

  if (!workspaceId) {
    return c.json({ error: 'workspace query param is required' }, 400);
  }

  const lbls = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.workspaceId, workspaceId));

  return c.json(lbls);
});

// Create label
app.post('/', async (c) => {
  const body = await c.req.json<CreateLabelInput>();

  if (!body.workspaceId || !body.name || !body.color) {
    return c.json({ error: 'workspaceId, name, and color are required' }, 400);
  }

  const labelId = crypto.randomUUID();

  await db.insert(schema.labels).values({
    id: labelId,
    workspaceId: body.workspaceId,
    name: body.name,
    color: body.color,
  });

  const label = await db.query.labels.findFirst({
    where: eq(schema.labels.id, labelId),
  });

  return c.json(label, 201);
});

// Update label
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<UpdateLabelInput>();

  const existing = await db.query.labels.findFirst({
    where: eq(schema.labels.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Label not found' }, 404);
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.color !== undefined) updateData.color = body.color;

  await db.update(schema.labels).set(updateData).where(eq(schema.labels.id, id));

  const updated = await db.query.labels.findFirst({
    where: eq(schema.labels.id, id),
  });

  return c.json(updated);
});

// Delete label
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await db.query.labels.findFirst({
    where: eq(schema.labels.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Label not found' }, 404);
  }

  // Remove from task_labels first
  await db.delete(schema.taskLabels).where(eq(schema.taskLabels.labelId, id));
  await db.delete(schema.labels).where(eq(schema.labels.id, id));

  return c.json({ success: true });
});

export default app;
