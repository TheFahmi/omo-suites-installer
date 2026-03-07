// OpenCode Session
export interface Session {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
  title: string;
  version: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
  };
}

// OpenCode Todo
export interface Todo {
  id: string;
  content: string;
  status: string; // pending, in_progress, completed, cancelled
  priority: string; // high, medium, low
}

// Board types from our aggregated API
export interface BoardTodo extends Todo {
  sessionId: string;
  sessionTitle: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  todos: BoardTodo[];
}

export interface SessionSummary {
  id: string;
  title: string;
  directory: string;
  todoCount: number;
  time: {
    created: number;
    updated: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
}

export interface BoardData {
  columns: BoardColumn[];
  sessions: SessionSummary[];
}
