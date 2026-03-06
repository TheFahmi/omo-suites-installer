import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const LAUNCHBOARD_API = process.env.LAUNCHBOARD_API_URL || 'http://localhost:3030';

const server = new Server(
  { name: 'launchboard-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─── API Helper ──────────────────────────────────────────────────────

async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${LAUNCHBOARD_API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Launchboard API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Resolve helpers ─────────────────────────────────────────────────

/** Resolve workspace name to ID. Returns the ID if already a UUID. */
async function resolveWorkspaceId(nameOrId?: string): Promise<string | undefined> {
  if (!nameOrId) return undefined;
  // If it looks like a UUID, return as-is
  if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return nameOrId;
  // Otherwise search by name
  const workspaces: any[] = await apiCall('GET', '/api/workspaces');
  const match = workspaces.find(
    (w) => w.name.toLowerCase() === nameOrId.toLowerCase()
  );
  return match?.id;
}

/** Resolve column name to column ID within a workspace. */
async function resolveColumnId(
  workspaceId: string,
  columnName: string
): Promise<string | undefined> {
  if (/^[0-9a-f-]{36}$/i.test(columnName)) return columnName;
  const ws: any = await apiCall('GET', `/api/workspaces/${workspaceId}`);
  const col = ws.columns?.find(
    (c: any) => c.name.toLowerCase() === columnName.toLowerCase()
  );
  return col?.id;
}

/** Resolve task shortId or UUID to the actual task UUID. */
async function resolveTaskId(taskIdOrShort: string): Promise<string> {
  if (/^[0-9a-f-]{36}$/i.test(taskIdOrShort)) return taskIdOrShort;
  // Search all tasks for matching shortId
  const tasks: any[] = await apiCall('GET', '/api/tasks');
  const match = tasks.find(
    (t) => t.shortId?.toLowerCase() === taskIdOrShort.toLowerCase()
  );
  if (!match) throw new Error(`Task not found: ${taskIdOrShort}`);
  return match.id;
}

/** Get first workspace ID if none specified. */
async function getDefaultWorkspaceId(): Promise<string> {
  const workspaces: any[] = await apiCall('GET', '/api/workspaces');
  if (workspaces.length === 0) throw new Error('No workspaces exist. Create one first.');
  return workspaces[0].id;
}

// ─── Column name mapping ─────────────────────────────────────────────

const COLUMN_NAME_MAP: Record<string, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  ready: 'Ready',
  'in-progress': 'In Progress',
  testing: 'Testing',
  done: 'Done',
};

// ─── Tool Definitions ────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'launchboard_list_tasks',
    description:
      'List and filter tasks from the Launchboard board. Returns tasks with shortId, title, column, priority, labels, progress, assignee.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name or ID',
        },
        column: {
          type: 'string',
          enum: ['backlog', 'planned', 'ready', 'in-progress', 'testing', 'done'],
          description: 'Filter by column',
        },
        priority: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: '1=critical, 2=high, 3=medium, 4=low',
        },
        search: {
          type: 'string',
          description: 'Search query for task title',
        },
      },
    },
  },
  {
    name: 'launchboard_create_task',
    description:
      'Create a new task on the Launchboard board. Returns the created task with shortId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        workspace: {
          type: 'string',
          description: 'Workspace name or ID (defaults to first workspace)',
        },
        priority: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: '1=critical, 2=high, 3=medium, 4=low (default: 3)',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Label names to attach (e.g., feat, bug, chore)',
        },
        description: { type: 'string', description: 'Task description' },
        assignee: { type: 'string', description: 'Assignee name' },
        column: {
          type: 'string',
          enum: ['backlog', 'planned', 'ready', 'in-progress', 'testing', 'done'],
          description: 'Column to place task in (default: backlog)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'launchboard_update_task',
    description:
      'Update an existing task. Use shortId (e.g., feat-a1b2) or UUID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'Task shortId or UUID (required)',
        },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        priority: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: '1=critical, 2=high, 3=medium, 4=low',
        },
        progress: {
          type: 'number',
          description: 'Progress percentage (0-100)',
        },
        column: {
          type: 'string',
          enum: ['backlog', 'planned', 'ready', 'in-progress', 'testing', 'done'],
          description: 'Move to column',
        },
        assignee: { type: 'string', description: 'New assignee' },
        aiAssisted: {
          type: 'boolean',
          description: 'Mark as AI-assisted',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'launchboard_move_task',
    description:
      "Move a task to a different column (e.g., from 'in-progress' to 'testing').",
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'Task shortId or UUID (required)',
        },
        column: {
          type: 'string',
          enum: ['backlog', 'planned', 'ready', 'in-progress', 'testing', 'done'],
          description: 'Target column (required)',
        },
      },
      required: ['taskId', 'column'],
    },
  },
  {
    name: 'launchboard_add_comment',
    description: 'Add a comment to a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'Task shortId or UUID (required)',
        },
        comment: {
          type: 'string',
          description: 'Comment text (required)',
        },
        author: {
          type: 'string',
          description: 'Comment author (default: "AI Agent")',
        },
      },
      required: ['taskId', 'comment'],
    },
  },
  {
    name: 'launchboard_get_stats',
    description:
      'Get workspace statistics — task counts by column, priority, completion rate, AI-assisted count.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name or ID (defaults to first workspace)',
        },
      },
    },
  },
  {
    name: 'launchboard_list_workspaces',
    description: 'List all workspaces with their task counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'launchboard_get_rules',
    description:
      'Get active AI project rules for a workspace. Rules guide AI agent behavior.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name or ID (defaults to first workspace)',
        },
      },
    },
  },
];

// ─── List Tools Handler ──────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// ─── Call Tool Handler ───────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── launchboard_list_tasks ──────────────────────────────────────
      case 'launchboard_list_tasks': {
        const query = new URLSearchParams();
        if (args?.workspace) {
          const wsId = await resolveWorkspaceId(args.workspace as string);
          if (wsId) query.set('workspace', wsId);
        }
        if (args?.column) {
          // Need to resolve column name to column ID within workspace
          const wsId = args?.workspace
            ? await resolveWorkspaceId(args.workspace as string)
            : await getDefaultWorkspaceId();
          if (wsId) {
            const colName = COLUMN_NAME_MAP[(args.column as string).toLowerCase()] || (args.column as string);
            const colId = await resolveColumnId(wsId, colName);
            if (colId) query.set('column', colId);
          }
        }
        if (args?.priority) query.set('priority', String(args.priority));
        if (args?.search) query.set('search', args.search as string);

        const tasks = await apiCall('GET', `/api/tasks?${query}`);
        const summary = (tasks as any[]).map((t) => ({
          shortId: t.shortId,
          title: t.title,
          column: t.columnId,
          priority: t.priority,
          progress: t.progress,
          assignee: t.assignee,
          labels: t.labels?.map((l: any) => l.name) ?? [],
          aiAssisted: t.aiAssisted,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      // ── launchboard_create_task ─────────────────────────────────────
      case 'launchboard_create_task': {
        const title = args?.title as string;
        if (!title) throw new Error('title is required');

        const wsId = args?.workspace
          ? await resolveWorkspaceId(args.workspace as string)
          : await getDefaultWorkspaceId();

        if (!wsId) throw new Error('Workspace not found');

        // Resolve label names to IDs
        let labelIds: string[] | undefined;
        if (args?.labels && Array.isArray(args.labels)) {
          const ws: any = await apiCall('GET', `/api/workspaces/${wsId}`);
          labelIds = [];
          for (const labelName of args.labels as string[]) {
            const label = ws.labels?.find(
              (l: any) => l.name.toLowerCase() === labelName.toLowerCase()
            );
            if (label) labelIds.push(label.id);
          }
        }

        // Resolve column name to ID
        let columnId: string | undefined;
        if (args?.column) {
          const colName = COLUMN_NAME_MAP[(args.column as string).toLowerCase()] || (args.column as string);
          columnId = await resolveColumnId(wsId, colName);
        }

        const body: any = {
          workspaceId: wsId,
          title,
          priority: (args?.priority as number) ?? 3,
          description: args?.description as string,
          assignee: args?.assignee as string,
          ...(columnId && { columnId }),
          ...(labelIds && labelIds.length > 0 && { labelIds }),
        };

        const task = await apiCall('POST', '/api/tasks', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  shortId: task.shortId,
                  id: task.id,
                  title: task.title,
                  priority: task.priority,
                  column: task.columnId,
                  message: `Task ${task.shortId} created successfully`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── launchboard_update_task ─────────────────────────────────────
      case 'launchboard_update_task': {
        const taskIdRaw = args?.taskId as string;
        if (!taskIdRaw) throw new Error('taskId is required');
        const taskId = await resolveTaskId(taskIdRaw);

        const body: any = {};
        if (args?.title !== undefined) body.title = args.title;
        if (args?.description !== undefined) body.description = args.description;
        if (args?.priority !== undefined) body.priority = args.priority;
        if (args?.progress !== undefined) body.progress = args.progress;
        if (args?.assignee !== undefined) body.assignee = args.assignee;
        if (args?.aiAssisted !== undefined) body.aiAssisted = args.aiAssisted;

        // Resolve column name if provided
        if (args?.column) {
          const task: any = await apiCall('GET', `/api/tasks/${taskId}`);
          const colName = COLUMN_NAME_MAP[(args.column as string).toLowerCase()] || (args.column as string);
          const colId = await resolveColumnId(task.workspaceId, colName);
          if (colId) body.columnId = colId;
        }

        const updated = await apiCall('PATCH', `/api/tasks/${taskId}`, body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  shortId: updated.shortId,
                  title: updated.title,
                  priority: updated.priority,
                  progress: updated.progress,
                  assignee: updated.assignee,
                  message: `Task ${updated.shortId} updated`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── launchboard_move_task ───────────────────────────────────────
      case 'launchboard_move_task': {
        const taskIdRaw = args?.taskId as string;
        const column = args?.column as string;
        if (!taskIdRaw) throw new Error('taskId is required');
        if (!column) throw new Error('column is required');

        const taskId = await resolveTaskId(taskIdRaw);
        const task: any = await apiCall('GET', `/api/tasks/${taskId}`);
        const colName = COLUMN_NAME_MAP[column.toLowerCase()] || column;
        const colId = await resolveColumnId(task.workspaceId, colName);

        if (!colId) throw new Error(`Column not found: ${column}`);

        const moved = await apiCall('POST', `/api/tasks/${taskId}/move`, {
          columnId: colId,
          position: 0,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  shortId: moved.shortId,
                  title: moved.title,
                  movedTo: column,
                  message: `Task ${moved.shortId} moved to ${column}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── launchboard_add_comment ─────────────────────────────────────
      case 'launchboard_add_comment': {
        const taskIdRaw = args?.taskId as string;
        const comment = args?.comment as string;
        if (!taskIdRaw) throw new Error('taskId is required');
        if (!comment) throw new Error('comment is required');

        const taskId = await resolveTaskId(taskIdRaw);
        const author = (args?.author as string) || 'AI Agent';

        const created = await apiCall('POST', `/api/tasks/${taskId}/comments`, {
          author,
          content: comment,
          isAi: true,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: created.id,
                  author: created.author,
                  content: created.content,
                  message: `Comment added to task`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── launchboard_get_stats ───────────────────────────────────────
      case 'launchboard_get_stats': {
        const wsId = args?.workspace
          ? await resolveWorkspaceId(args.workspace as string)
          : await getDefaultWorkspaceId();

        if (!wsId) throw new Error('Workspace not found');

        const stats = await apiCall('GET', `/api/stats/${wsId}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      // ── launchboard_list_workspaces ─────────────────────────────────
      case 'launchboard_list_workspaces': {
        const workspaces = await apiCall('GET', '/api/workspaces');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workspaces, null, 2),
            },
          ],
        };
      }

      // ── launchboard_get_rules ───────────────────────────────────────
      case 'launchboard_get_rules': {
        const wsId = args?.workspace
          ? await resolveWorkspaceId(args.workspace as string)
          : await getDefaultWorkspaceId();

        if (!wsId) throw new Error('Workspace not found');

        const rules = await apiCall('GET', `/api/rules?workspace=${wsId}`);

        // Filter to enabled rules only
        const activeRules = (rules as any[]).filter((r) => r.enabled !== false);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                activeRules.map((r) => ({
                  id: r.id,
                  title: r.title,
                  content: r.content,
                  enabled: r.enabled,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start Server ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Launchboard MCP server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
