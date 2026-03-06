import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, like, inArray, desc, asc, sql } from 'drizzle-orm';
import { generateShortId } from '../types';
import type { CreateTaskInput, UpdateTaskInput, MoveTaskInput, CreateCommentInput } from '../types';

const app = new Hono();

// List/filter tasks
app.get('/', async (c) => {
  const workspace = c.req.query('workspace');
  const columnId = c.req.query('column');
  const priority = c.req.query('priority');
  const label = c.req.query('label');
  const search = c.req.query('search');
  const assignee = c.req.query('assignee');

  const conditions: any[] = [];

  if (workspace) conditions.push(eq(schema.tasks.workspaceId, workspace));
  if (columnId) conditions.push(eq(schema.tasks.columnId, columnId));
  if (priority) conditions.push(eq(schema.tasks.priority, parseInt(priority)));
  if (assignee) conditions.push(eq(schema.tasks.assignee, assignee));
  if (search) conditions.push(like(schema.tasks.title, `%${search}%`));

  let query = db.select().from(schema.tasks);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let allTasks = await (query as any).orderBy(asc(schema.tasks.position));

  // Filter by label if specified
  if (label) {
    const taskIdsWithLabel = await db
      .select({ taskId: schema.taskLabels.taskId })
      .from(schema.taskLabels)
      .where(eq(schema.taskLabels.labelId, label));
    const labelTaskIds = new Set(taskIdsWithLabel.map((t: any) => t.taskId));
    allTasks = allTasks.filter((t: any) => labelTaskIds.has(t.id));
  }

  // Attach labels to each task
  const result = await Promise.all(
    allTasks.map(async (task: any) => {
      const taskLabelRows = await db
        .select({ labelId: schema.taskLabels.labelId })
        .from(schema.taskLabels)
        .where(eq(schema.taskLabels.taskId, task.id));

      let labels: any[] = [];
      if (taskLabelRows.length > 0) {
        labels = await db
          .select()
          .from(schema.labels)
          .where(
            inArray(
              schema.labels.id,
              taskLabelRows.map((tl: any) => tl.labelId)
            )
          );
      }

      return { ...task, labels };
    })
  );

  return c.json(result);
});

// Create task
app.post('/', async (c) => {
  const body = await c.req.json<CreateTaskInput>();

  if (!body.workspaceId || !body.title) {
    return c.json({ error: 'workspaceId and title are required' }, 400);
  }

  // Verify workspace exists
  const workspace = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.id, body.workspaceId),
  });
  if (!workspace) {
    return c.json({ error: 'Workspace not found' }, 404);
  }

  // Get or use default column (first column / Backlog)
  let columnId = body.columnId;
  if (!columnId) {
    const firstCol = await db
      .select()
      .from(schema.columns)
      .where(eq(schema.columns.workspaceId, body.workspaceId))
      .orderBy(asc(schema.columns.position))
      .limit(1);

    if (firstCol.length === 0) {
      return c.json({ error: 'No columns in workspace' }, 400);
    }
    columnId = firstCol[0].id;
  }

  // Determine short ID based on labels
  let shortIdPrefix = 'task';
  if (body.labelIds && body.labelIds.length > 0) {
    const firstLabel = await db.query.labels.findFirst({
      where: eq(schema.labels.id, body.labelIds[0]),
    });
    if (firstLabel) {
      shortIdPrefix = firstLabel.name;
    }
  }
  const shortId = generateShortId(shortIdPrefix);

  // Get max position in column
  const maxPos = await db
    .select({ maxPosition: sql<number>`COALESCE(MAX(${schema.tasks.position}), -1)` })
    .from(schema.tasks)
    .where(eq(schema.tasks.columnId, columnId));
  const position = (maxPos[0]?.maxPosition ?? -1) + 1;

  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.tasks).values({
    id: taskId,
    shortId,
    workspaceId: body.workspaceId,
    columnId,
    title: body.title,
    description: body.description ?? null,
    priority: body.priority ?? 3,
    progress: 0,
    position,
    assignee: body.assignee ?? null,
    aiAssisted: body.aiAssisted ?? false,
    aiAgent: body.aiAgent ?? null,
    dueDate: body.dueDate ?? null,
    estimateHours: body.estimateHours ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Attach labels
  if (body.labelIds && body.labelIds.length > 0) {
    for (const labelId of body.labelIds) {
      await db.insert(schema.taskLabels).values({
        taskId,
        labelId,
      });
    }
  }

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId: body.workspaceId,
    taskId,
    action: 'task_created',
    actor: body.assignee ?? 'system',
    details: JSON.stringify({ title: body.title, shortId }),
    createdAt: now,
  });

  const task = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
  });

  return c.json(task, 201);
});

// Get task with labels and comments
app.get('/:id', async (c) => {
  const { id } = c.req.param();

  const task = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Get labels
  const taskLabelRows = await db
    .select({ labelId: schema.taskLabels.labelId })
    .from(schema.taskLabels)
    .where(eq(schema.taskLabels.taskId, id));

  let labels: any[] = [];
  if (taskLabelRows.length > 0) {
    labels = await db
      .select()
      .from(schema.labels)
      .where(
        inArray(
          schema.labels.id,
          taskLabelRows.map((tl) => tl.labelId)
        )
      );
  }

  // Get comments
  const comments = await db
    .select()
    .from(schema.taskComments)
    .where(eq(schema.taskComments.taskId, id))
    .orderBy(asc(schema.taskComments.createdAt));

  return c.json({ ...task, labels, comments });
});

// Update task
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<UpdateTaskInput>();

  const existing = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: any = { updatedAt: now };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.progress !== undefined) updateData.progress = body.progress;
  if (body.columnId !== undefined) updateData.columnId = body.columnId;
  if (body.position !== undefined) updateData.position = body.position;
  if (body.assignee !== undefined) updateData.assignee = body.assignee;
  if (body.aiAssisted !== undefined) updateData.aiAssisted = body.aiAssisted;
  if (body.aiAgent !== undefined) updateData.aiAgent = body.aiAgent;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
  if (body.estimateHours !== undefined) updateData.estimateHours = body.estimateHours;
  if (body.actualHours !== undefined) updateData.actualHours = body.actualHours;

  // Check if task is being completed (progress = 100 or moved to last column)
  if (body.progress === 100 && !existing.completedAt) {
    updateData.completedAt = now;
  }

  await db.update(schema.tasks).set(updateData).where(eq(schema.tasks.id, id));

  // Update labels if provided
  if (body.labelIds !== undefined) {
    await db.delete(schema.taskLabels).where(eq(schema.taskLabels.taskId, id));
    for (const labelId of body.labelIds) {
      await db.insert(schema.taskLabels).values({ taskId: id, labelId });
    }
  }

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId: existing.workspaceId,
    taskId: id,
    action: 'task_updated',
    actor: body.assignee ?? existing.assignee ?? 'system',
    details: JSON.stringify(body),
    createdAt: now,
  });

  const updated = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  return c.json(updated);
});

// Delete task
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId: existing.workspaceId,
    taskId: id,
    action: 'task_deleted',
    actor: 'system',
    details: JSON.stringify({ title: existing.title, shortId: existing.shortId }),
    createdAt: new Date().toISOString(),
  });

  return c.json({ success: true });
});

// Move task to column + position (drag-and-drop)
app.post('/:id/move', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<MoveTaskInput>();

  const existing = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  if (!body.columnId) {
    return c.json({ error: 'columnId is required' }, 400);
  }

  const now = new Date().toISOString();
  const oldColumnId = existing.columnId;

  // Check if the target column is the last (Done) column
  const targetCol = await db.query.columns.findFirst({
    where: eq(schema.columns.id, body.columnId),
  });

  const allCols = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.workspaceId, existing.workspaceId))
    .orderBy(desc(schema.columns.position))
    .limit(1);

  const isDoneColumn = allCols.length > 0 && allCols[0].id === body.columnId;

  // Shift positions in target column
  await db
    .update(schema.tasks)
    .set({ position: sql`${schema.tasks.position} + 1` })
    .where(
      and(
        eq(schema.tasks.columnId, body.columnId),
        sql`${schema.tasks.position} >= ${body.position ?? 0}`
      )
    );

  const updateData: any = {
    columnId: body.columnId,
    position: body.position ?? 0,
    updatedAt: now,
  };

  if (isDoneColumn && !existing.completedAt) {
    updateData.completedAt = now;
    updateData.progress = 100;
  }

  await db.update(schema.tasks).set(updateData).where(eq(schema.tasks.id, id));

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId: existing.workspaceId,
    taskId: id,
    action: 'task_moved',
    actor: existing.assignee ?? 'system',
    details: JSON.stringify({
      from: oldColumnId,
      to: body.columnId,
      columnName: targetCol?.name,
    }),
    createdAt: now,
  });

  const updated = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  return c.json(updated);
});

// Add comment to task
app.post('/:id/comments', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<CreateCommentInput>();

  const task = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  if (!body.author || !body.content) {
    return c.json({ error: 'author and content are required' }, 400);
  }

  const commentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.taskComments).values({
    id: commentId,
    taskId: id,
    author: body.author,
    content: body.content,
    isAi: body.isAi ?? false,
    createdAt: now,
  });

  // Log activity
  await db.insert(schema.activityLog).values({
    id: crypto.randomUUID(),
    workspaceId: task.workspaceId,
    taskId: id,
    action: 'comment_added',
    actor: body.author,
    details: JSON.stringify({ isAi: body.isAi ?? false }),
    createdAt: now,
  });

  const comment = await db.query.taskComments.findFirst({
    where: eq(schema.taskComments.id, commentId),
  });

  return c.json(comment, 201);
});

// Get comments for task
app.get('/:id/comments', async (c) => {
  const { id } = c.req.param();

  const task = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, id),
  });

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const comments = await db
    .select()
    .from(schema.taskComments)
    .where(eq(schema.taskComments.taskId, id))
    .orderBy(asc(schema.taskComments.createdAt));

  return c.json(comments);
});

export default app;
