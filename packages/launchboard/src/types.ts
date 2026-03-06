export interface CreateWorkspaceInput {
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  icon?: string;
  color?: string;
  description?: string;
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

export interface CreateColumnInput {
  workspaceId: string;
  name: string;
  icon?: string;
  position?: number;
  color?: string;
  wipLimit?: number;
}

export interface UpdateColumnInput {
  name?: string;
  icon?: string;
  position?: number;
  color?: string;
  wipLimit?: number | null;
}

export interface ReorderColumnsInput {
  columns: { id: string; position: number }[];
}

export interface CreateLabelInput {
  workspaceId: string;
  name: string;
  color: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export interface CreateCommentInput {
  author: string;
  content: string;
  isAi?: boolean;
}

export function generateShortId(labelName?: string): string {
  const hex = crypto.randomUUID().slice(0, 4);
  const prefix = labelName || 'task';
  return `${prefix}-${hex}`;
}
