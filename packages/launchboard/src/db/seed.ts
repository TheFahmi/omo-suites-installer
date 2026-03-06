import { db, schema } from './index';
import { eq, asc } from 'drizzle-orm';
import { generateShortId } from '../types';

const DEFAULT_COLUMNS = [
  { name: 'Backlog', icon: '📥', position: 0, color: '#6b7280' },
  { name: 'Planned', icon: '📋', position: 1, color: '#3b82f6' },
  { name: 'Ready', icon: '🎯', position: 2, color: '#06b6d4' },
  { name: 'In Progress', icon: '🔨', position: 3, color: '#f59e0b' },
  { name: 'Testing', icon: '🧪', position: 4, color: '#eab308' },
  { name: 'Done', icon: '✅', position: 5, color: '#22c55e' },
];

const DEFAULT_LABELS = [
  { name: 'feat', color: '#22c55e' },
  { name: 'bug', color: '#ef4444' },
  { name: 'chore', color: '#f59e0b' },
  { name: 'research', color: '#3b82f6' },
  { name: 'docs', color: '#06b6d4' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Check if workspace already exists
  const existing = await db.select().from(schema.workspaces);
  if (existing.length > 0) {
    console.log('⏭️  Database already seeded, skipping.');
    return;
  }

  const workspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create workspace
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: 'Development',
    icon: '🚀',
    color: '#d4a853',
    description: 'Main development workspace for tracking features, bugs, and tasks.',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ Created workspace: Development');

  // Create columns
  const columnIds: Record<string, string> = {};
  for (const col of DEFAULT_COLUMNS) {
    const colId = crypto.randomUUID();
    columnIds[col.name] = colId;
    await db.insert(schema.columns).values({
      id: colId,
      workspaceId,
      name: col.name,
      icon: col.icon,
      position: col.position,
      color: col.color,
    });
  }
  console.log('✅ Created 6 default columns');

  // Create labels
  const labelIds: Record<string, string> = {};
  for (const label of DEFAULT_LABELS) {
    const lblId = crypto.randomUUID();
    labelIds[label.name] = lblId;
    await db.insert(schema.labels).values({
      id: lblId,
      workspaceId,
      name: label.name,
      color: label.color,
    });
  }
  console.log('✅ Created 5 default labels');

  // Create sample tasks
  const sampleTasks = [
    {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment.',
      priority: 2,
      column: 'Backlog',
      label: 'chore',
    },
    {
      title: 'Design database schema',
      description: 'Define tables, relationships, and indexes for the application.',
      priority: 1,
      column: 'Done',
      label: 'feat',
      progress: 100,
    },
    {
      title: 'Implement user authentication',
      description: 'Add JWT-based auth with login, register, and token refresh.',
      priority: 1,
      column: 'In Progress',
      label: 'feat',
      assignee: 'Freya',
      aiAssisted: true,
      aiAgent: 'claude-opus',
    },
    {
      title: 'Fix login redirect loop',
      description: 'Users get stuck in redirect loop after session expires.',
      priority: 2,
      column: 'Ready',
      label: 'bug',
    },
    {
      title: 'Research WebSocket vs SSE',
      description: 'Compare WebSocket and Server-Sent Events for real-time updates.',
      priority: 3,
      column: 'Planned',
      label: 'research',
    },
    {
      title: 'Write API documentation',
      description: 'Document all REST endpoints with examples and schemas.',
      priority: 3,
      column: 'Backlog',
      label: 'docs',
    },
    {
      title: 'Add dark mode support',
      description: 'Implement theme switching with system preference detection.',
      priority: 4,
      column: 'Backlog',
      label: 'feat',
    },
    {
      title: 'Optimize database queries',
      description: 'Profile and optimize slow queries, add missing indexes.',
      priority: 2,
      column: 'Testing',
      label: 'chore',
      progress: 80,
    },
  ];

  for (let i = 0; i < sampleTasks.length; i++) {
    const task = sampleTasks[i];
    const taskId = crypto.randomUUID();
    const shortId = generateShortId(task.label);
    const columnId = columnIds[task.column];

    await db.insert(schema.tasks).values({
      id: taskId,
      shortId,
      workspaceId,
      columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      progress: task.progress ?? 0,
      position: i,
      assignee: task.assignee ?? null,
      aiAssisted: task.aiAssisted ?? false,
      aiAgent: task.aiAgent ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: task.progress === 100 ? now : null,
    });

    // Attach label
    if (task.label && labelIds[task.label]) {
      await db.insert(schema.taskLabels).values({
        taskId,
        labelId: labelIds[task.label],
      });
    }

    // Log activity
    await db.insert(schema.activityLog).values({
      id: crypto.randomUUID(),
      workspaceId,
      taskId,
      action: 'task_created',
      actor: 'system',
      details: JSON.stringify({ title: task.title, shortId }),
      createdAt: now,
    });
  }
  console.log(`✅ Created ${sampleTasks.length} sample tasks`);

  // Add a sample comment
  const firstTask = await db.select().from(schema.tasks).where(eq(schema.tasks.workspaceId, workspaceId)).limit(1);
  if (firstTask.length > 0) {
    await db.insert(schema.taskComments).values({
      id: crypto.randomUUID(),
      taskId: firstTask[0].id,
      author: 'Freya',
      content: 'This task has been analyzed and broken down into subtasks. Ready for implementation.',
      isAi: true,
      createdAt: now,
    });
    console.log('✅ Added sample comment');
  }

  // Add a sample rule
  await db.insert(schema.rules).values({
    id: crypto.randomUUID(),
    workspaceId,
    title: 'Code Review Guidelines',
    content: '## Code Review Rules\n\n1. All PRs must have at least one reviewer\n2. Tests are required for new features\n3. No direct pushes to main branch\n4. Follow conventional commit messages',
    enabled: true,
    createdAt: now,
  });
  console.log('✅ Added sample rule');

  console.log('\n🎉 Seeding complete!');
}

seed().catch(console.error);
