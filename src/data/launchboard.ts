// ─── Launchboard API Client ─────────────────────────────────────────────
// Direct HTTP client for Launchboard task management.
// Used by OMO Suites plugin tools (omocs_task_*).

const LAUNCHBOARD_API = process.env.LAUNCHBOARD_API_URL || 'http://localhost:3030';

export async function launchboardApi(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${LAUNCHBOARD_API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Launchboard API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Column name → column ID mapping ────────────────────────────────

const COLUMN_NAME_MAP: Record<string, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  ready: 'Ready',
  'in-progress': 'In Progress',
  testing: 'Testing',
  done: 'Done',
};

// ─── Resolve Helpers ─────────────────────────────────────────────────

export async function resolveWorkspaceId(nameOrId?: string): Promise<string | undefined> {
  if (!nameOrId) return undefined;
  if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return nameOrId;
  const workspaces: any[] = await launchboardApi('GET', '/api/workspaces');
  const match = workspaces.find(
    (w) => w.name.toLowerCase() === nameOrId.toLowerCase()
  );
  return match?.id;
}

export async function getDefaultWorkspaceId(): Promise<string> {
  const workspaces: any[] = await launchboardApi('GET', '/api/workspaces');
  if (workspaces.length === 0) throw new Error('No workspaces exist. Create one first.');
  return workspaces[0].id;
}

export async function resolveColumnId(
  workspaceId: string,
  columnName: string
): Promise<string | undefined> {
  if (/^[0-9a-f-]{36}$/i.test(columnName)) return columnName;
  const ws: any = await launchboardApi('GET', `/api/workspaces/${workspaceId}`);
  const col = ws.columns?.find(
    (c: any) => c.name.toLowerCase() === columnName.toLowerCase()
  );
  return col?.id;
}

export async function resolveTaskId(taskIdOrShort: string): Promise<string> {
  if (/^[0-9a-f-]{36}$/i.test(taskIdOrShort)) return taskIdOrShort;
  const tasks: any[] = await launchboardApi('GET', '/api/tasks');
  const match = tasks.find(
    (t) => t.shortId?.toLowerCase() === taskIdOrShort.toLowerCase()
  );
  if (!match) throw new Error(`Task not found: ${taskIdOrShort}`);
  return match.id;
}

// ─── High-Level API Functions ────────────────────────────────────────

export async function listTasks(params?: {
  workspace?: string;
  column?: string;
  priority?: number;
  search?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  let wsId: string | undefined;

  if (params?.workspace) {
    wsId = await resolveWorkspaceId(params.workspace);
    if (wsId) query.set('workspace', wsId);
  }

  if (params?.column) {
    if (!wsId) wsId = await getDefaultWorkspaceId();
    const colName = COLUMN_NAME_MAP[params.column.toLowerCase()] || params.column;
    const colId = await resolveColumnId(wsId, colName);
    if (colId) query.set('column', colId);
  }

  if (params?.priority) query.set('priority', String(params.priority));
  if (params?.search) query.set('search', params.search);

  return launchboardApi('GET', `/api/tasks?${query}`);
}

export async function createTask(data: {
  title: string;
  workspace?: string;
  priority?: number;
  description?: string;
  labels?: string[];
  assignee?: string;
  column?: string;
}): Promise<any> {
  const wsId = data.workspace
    ? await resolveWorkspaceId(data.workspace)
    : await getDefaultWorkspaceId();

  if (!wsId) throw new Error('Workspace not found');

  // Resolve label names to IDs
  let labelIds: string[] | undefined;
  if (data.labels && data.labels.length > 0) {
    const ws: any = await launchboardApi('GET', `/api/workspaces/${wsId}`);
    labelIds = [];
    for (const name of data.labels) {
      const label = ws.labels?.find(
        (l: any) => l.name.toLowerCase() === name.toLowerCase()
      );
      if (label) labelIds.push(label.id);
    }
  }

  // Resolve column
  let columnId: string | undefined;
  if (data.column) {
    const colName = COLUMN_NAME_MAP[data.column.toLowerCase()] || data.column;
    columnId = await resolveColumnId(wsId, colName);
  }

  return launchboardApi('POST', '/api/tasks', {
    workspaceId: wsId,
    title: data.title,
    priority: data.priority ?? 3,
    description: data.description,
    assignee: data.assignee,
    ...(columnId && { columnId }),
    ...(labelIds && labelIds.length > 0 && { labelIds }),
  });
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    priority?: number;
    progress?: number;
    column?: string;
    description?: string;
    assignee?: string;
    aiAssisted?: boolean;
  }
): Promise<any> {
  const resolvedId = await resolveTaskId(taskId);

  const body: any = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.progress !== undefined) body.progress = data.progress;
  if (data.assignee !== undefined) body.assignee = data.assignee;
  if (data.aiAssisted !== undefined) body.aiAssisted = data.aiAssisted;

  if (data.column) {
    const task: any = await launchboardApi('GET', `/api/tasks/${resolvedId}`);
    const colName = COLUMN_NAME_MAP[data.column.toLowerCase()] || data.column;
    const colId = await resolveColumnId(task.workspaceId, colName);
    if (colId) body.columnId = colId;
  }

  return launchboardApi('PATCH', `/api/tasks/${resolvedId}`, body);
}

export async function moveTask(taskId: string, column: string): Promise<any> {
  const resolvedId = await resolveTaskId(taskId);
  const task: any = await launchboardApi('GET', `/api/tasks/${resolvedId}`);
  const colName = COLUMN_NAME_MAP[column.toLowerCase()] || column;
  const colId = await resolveColumnId(task.workspaceId, colName);

  if (!colId) throw new Error(`Column not found: ${column}`);

  return launchboardApi('POST', `/api/tasks/${resolvedId}/move`, {
    columnId: colId,
    position: 0,
  });
}
