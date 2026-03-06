import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, sql, desc, and, gte, count } from 'drizzle-orm';

const app = new Hono();

// Overall stats
app.get('/:workspaceId', async (c) => {
  const { workspaceId } = c.req.param();

  // Total tasks
  const totalResult = await db
    .select({ count: count() })
    .from(schema.tasks)
    .where(eq(schema.tasks.workspaceId, workspaceId));
  const total = totalResult[0]?.count ?? 0;

  // Tasks by column
  const cols = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.workspaceId, workspaceId))
    .orderBy(schema.columns.position);

  const byColumn = await Promise.all(
    cols.map(async (col) => {
      const result = await db
        .select({ count: count() })
        .from(schema.tasks)
        .where(eq(schema.tasks.columnId, col.id));
      return { column: col.name, columnId: col.id, count: result[0]?.count ?? 0 };
    })
  );

  // Tasks by priority
  const byPriority = await db
    .select({
      priority: schema.tasks.priority,
      count: count(),
    })
    .from(schema.tasks)
    .where(eq(schema.tasks.workspaceId, workspaceId))
    .groupBy(schema.tasks.priority);

  const priorityMap: Record<number, string> = {
    1: 'critical',
    2: 'high',
    3: 'medium',
    4: 'low',
  };

  const byPriorityNamed = byPriority.map((p) => ({
    priority: p.priority,
    name: priorityMap[p.priority] ?? 'unknown',
    count: p.count,
  }));

  // Tasks by label
  const lbls = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.workspaceId, workspaceId));

  const byLabel = await Promise.all(
    lbls.map(async (lbl) => {
      const result = await db
        .select({ count: count() })
        .from(schema.taskLabels)
        .where(eq(schema.taskLabels.labelId, lbl.id));
      return { label: lbl.name, labelId: lbl.id, color: lbl.color, count: result[0]?.count ?? 0 };
    })
  );

  // Completed tasks
  const completedResult = await db
    .select({ count: count() })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.workspaceId, workspaceId),
        sql`${schema.tasks.completedAt} IS NOT NULL`
      )
    );
  const completed = completedResult[0]?.count ?? 0;

  // AI assisted tasks
  const aiResult = await db
    .select({ count: count() })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.workspaceId, workspaceId),
        eq(schema.tasks.aiAssisted, true)
      )
    );
  const aiAssisted = aiResult[0]?.count ?? 0;

  return c.json({
    total,
    completed,
    aiAssisted,
    byColumn,
    byPriority: byPriorityNamed,
    byLabel,
  });
});

// Velocity — tasks completed per day/week
app.get('/:workspaceId/velocity', async (c) => {
  const { workspaceId } = c.req.param();
  const period = c.req.query('period') ?? 'day'; // day or week

  let groupBy: string;
  if (period === 'week') {
    groupBy = `strftime('%Y-W%W', completed_at)`;
  } else {
    groupBy = `date(completed_at)`;
  }

  const velocity = await db.all(
    sql.raw(`
      SELECT ${groupBy} as period, COUNT(*) as count
      FROM tasks
      WHERE workspace_id = '${workspaceId}'
        AND completed_at IS NOT NULL
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 30
    `)
  );

  return c.json(velocity);
});

// Activity log
app.get('/:workspaceId/activity', async (c) => {
  const { workspaceId } = c.req.param();
  const limit = parseInt(c.req.query('limit') ?? '50');

  const activities = await db
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.workspaceId, workspaceId))
    .orderBy(desc(schema.activityLog.createdAt))
    .limit(limit);

  return c.json(activities);
});

export default app;
