export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  columns?: Column[];
  labels?: Label[];
  rules?: Rule[];
}

export interface Column {
  id: string;
  workspaceId: string;
  name: string;
  icon: string | null;
  position: number;
  color: string | null;
  wipLimit: number | null;
  taskCount?: number;
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  shortId: string;
  workspaceId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: number;
  progress: number;
  position: number;
  assignee: string | null;
  aiAssisted: boolean;
  aiAgent: string | null;
  dueDate: string | null;
  estimateHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  labels?: Label[];
  comments?: Comment[];
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  isAi: boolean;
  createdAt: string;
}

export interface Rule {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  taskId: string | null;
  action: string;
  actor: string;
  details: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  completed: number;
  aiAssisted: number;
  byColumn: { column: string; columnId: string; count: number }[];
  byPriority: { priority: number; name: string; count: number }[];
  byLabel: { label: string; labelId: string; color: string; count: number }[];
}

export interface VelocityEntry {
  period: string;
  count: number;
}

export interface CreateTaskInput {
  workspaceId: string;
  columnId?: string;
  title: string;
  description?: string;
  priority?: number;
  assignee?: string;
  aiAssisted?: boolean;
  aiAgent?: string;
  dueDate?: string;
  estimateHours?: number;
  labelIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: number;
  progress?: number;
  columnId?: string;
  position?: number;
  assignee?: string;
  aiAssisted?: boolean;
  aiAgent?: string;
  dueDate?: string;
  estimateHours?: number;
  actualHours?: number;
  labelIds?: string[];
}

export interface MoveTaskInput {
  columnId: string;
  position: number;
}
