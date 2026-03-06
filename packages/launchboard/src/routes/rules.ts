import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

// List rules for workspace
app.get('/', async (c) => {
  const workspace = c.req.query('workspace');

  if (!workspace) {
    // Return all rules
    const allRules = await db.select().from(schema.rules);
    return c.json(allRules);
  }

  const rules = await db
    .select()
    .from(schema.rules)
    .where(eq(schema.rules.workspaceId, workspace));

  return c.json(rules);
});

// Create rule
app.post('/', async (c) => {
  const body = await c.req.json<{ workspaceId: string; title: string; content: string; enabled?: boolean }>();

  if (!body.workspaceId || !body.title || !body.content) {
    return c.json({ error: 'workspaceId, title, and content are required' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.rules).values({
    id,
    workspaceId: body.workspaceId,
    title: body.title,
    content: body.content,
    enabled: body.enabled ?? true,
    createdAt: now,
  });

  const rule = await db.query.rules.findFirst({
    where: eq(schema.rules.id, id),
  });

  return c.json(rule, 201);
});

// Update rule
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ title?: string; content?: string; enabled?: boolean }>();

  const existing = await db.query.rules.findFirst({
    where: eq(schema.rules.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Rule not found' }, 404);
  }

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  await db.update(schema.rules).set(updateData).where(eq(schema.rules.id, id));

  const updated = await db.query.rules.findFirst({
    where: eq(schema.rules.id, id),
  });

  return c.json(updated);
});

// Delete rule
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await db.query.rules.findFirst({
    where: eq(schema.rules.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Rule not found' }, 404);
  }

  await db.delete(schema.rules).where(eq(schema.rules.id, id));

  return c.json({ success: true });
});

export default app;
