import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  icon: text('icon').default('📁'),
  color: text('color').default('#d4a853'),
  description: text('description'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const columns = sqliteTable('columns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  position: integer('position').notNull().default(0),
  color: text('color'),
  wipLimit: integer('wip_limit'),
});

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  shortId: text('short_id').notNull(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  columnId: text('column_id').notNull().references(() => columns.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: integer('priority').notNull().default(3),
  progress: integer('progress').default(0),
  position: integer('position').notNull().default(0),
  assignee: text('assignee'),
  aiAssisted: integer('ai_assisted', { mode: 'boolean' }).default(false),
  aiAgent: text('ai_agent'),
  dueDate: text('due_date'),
  estimateHours: real('estimate_hours'),
  actualHours: real('actual_hours'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
});

export const taskLabels = sqliteTable('task_labels', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
});

export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  author: text('author').notNull(),
  content: text('content').notNull(),
  isAi: integer('is_ai', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull(),
  taskId: text('task_id'),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  details: text('details'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const rules = sqliteTable('rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
