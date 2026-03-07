'use client';

import { GitBranch } from 'lucide-react';
import type { BoardTodo } from '@/lib/types';

interface TodoCardProps {
  todo: BoardTodo;
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  high: { color: 'var(--p1)', label: 'High', dot: 'var(--p1)' },
  medium: { color: 'var(--p2)', label: 'Medium', dot: 'var(--p2)' },
  low: { color: 'var(--p4)', label: 'Low', dot: 'var(--p4)' },
};

export function TodoCard({ todo }: TodoCardProps) {
  const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      className="rounded-lg p-3 mb-1.5 task-card-hover cursor-default"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Priority badge row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: priority.dot }}
        />
        <span
          className="text-xs font-semibold"
          style={{ color: priority.color }}
        >
          {priority.label}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {todo.id.slice(0, 8)}
        </span>
      </div>

      {/* Content */}
      <p
        className="text-sm font-medium mb-2 line-clamp-3"
        style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}
      >
        {todo.content}
      </p>

      {/* Session info */}
      <div className="flex items-center gap-1.5">
        <GitBranch size={11} style={{ color: 'var(--text-muted)' }} />
        <span
          className="text-[11px] truncate"
          style={{ color: 'var(--text-muted)' }}
        >
          {todo.sessionTitle}
        </span>
      </div>
    </div>
  );
}
