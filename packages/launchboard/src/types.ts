// OpenCode API Types

export interface Session {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  summary?: {
    additions: number;
    deletions: number;
    files: number;
    diffs?: FileDiff[];
  };
  title: string;
  version: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
  };
}

export interface FileDiff {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

export interface Todo {
  id: string;
  content: string;
  status: string; // pending, in_progress, completed, cancelled
  priority: string; // high, medium, low
}

// Board types for the aggregated view
export interface BoardColumn {
  id: string;
  name: string;
  todos: BoardTodo[];
}

export interface BoardTodo extends Todo {
  sessionId: string;
  sessionTitle: string;
}
